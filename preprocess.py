#!/usr/bin/env python3
"""
Preprocessing pipeline for US gun incidents visualization.
Aggregates incidents into 3-year windows using H3 or fallback grid.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Union

import pandas as pd
import orjson
from dateutil.parser import parse as parse_date

# Try to import H3, fall back to grid if not available
try:
    import h3
    H3_AVAILABLE = True
except ImportError:
    H3_AVAILABLE = False
    print("Warning: H3 not available, falling back to lat/lon binning")


def detect_columns(df: pd.DataFrame) -> Tuple[str, str, str]:
    """
    Detect latitude, longitude, and date columns with common variants.
    Returns (lat_col, lon_col, date_col).
    """
    # Common latitude column names
    lat_candidates = ['lat', 'latitude', 'Latitude', 'LAT', 'y']
    lon_candidates = ['lon', 'lng', 'longitude', 'Longitude', 'LON', 'x']
    date_candidates = ['date', 'incident_date', 'Date', 'DATE', 'year']
    
    lat_col = None
    lon_col = None
    date_col = None
    
    # Find latitude column
    for col in lat_candidates:
        if col in df.columns:
            lat_col = col
            break
    
    # Find longitude column
    for col in lon_candidates:
        if col in df.columns:
            lon_col = col
            break
    
    # Find date column (prefer full date over year)
    for col in date_candidates:
        if col in df.columns:
            date_col = col
            break
    
    if not lat_col:
        raise ValueError("Could not find latitude column. Expected one of: " + ", ".join(lat_candidates))
    if not lon_col:
        raise ValueError("Could not find longitude column. Expected one of: " + ", ".join(lon_candidates))
    if not date_col:
        raise ValueError("Could not find date column. Expected one of: " + ", ".join(date_candidates))
    
    return lat_col, lon_col, date_col


def parse_date_column(df: pd.DataFrame, date_col: str) -> pd.Series:
    """
    Parse date column, handling both full dates and years.
    Returns datetime series with July 1 for year-only entries.
    """
    if date_col == 'year':
        # If it's just year, assume July 1 of that year
        return pd.to_datetime(df[date_col].astype(str) + '-07-01', errors='coerce')
    else:
        # Try to parse as full date
        try:
            return pd.to_datetime(df[date_col], errors='coerce')
        except:
            # If that fails, try dateutil parser
            return df[date_col].apply(lambda x: parse_date(str(x)) if pd.notna(x) else None)


def create_time_windows(min_year: int, max_year: int, years_per_window: int = 3) -> List[Dict[str, int]]:
    """Create time windows of specified years."""
    windows = []
    current_start = min_year
    
    while current_start <= max_year:
        current_end = min(current_start + years_per_window - 1, max_year)
        windows.append({"start": current_start, "end": current_end})
        current_start = current_end + 1
    
    return windows


def get_h3_cell(lat: float, lon: float, resolution: int) -> str:
    """Get H3 cell for given lat/lon at specified resolution."""
    return h3.latlng_to_cell(lat, lon, resolution)


def get_bin_cell(lat: float, lon: float, bin_size: float = 0.1) -> str:
    """Get bin cell ID for fallback grid."""
    bin_lat = int(lat * (1 / bin_size)) * bin_size
    bin_lon = int(lon * (1 / bin_size)) * bin_size
    return f"{bin_lat:.1f}_{bin_lon:.1f}"


def aggregate_incidents(df: pd.DataFrame, lat_col: str, lon_col: str, 
                       windows: List[Dict[str, int]], grid_type: str = "h3", 
                       h3_resolution: int = 6, bin_size: float = 0.1,
                       conus_only: bool = False) -> Dict:
    """
    Aggregate incidents by spatial cell and time window.
    """
    features = []
    
    # Filter to CONUS if requested
    if conus_only:
        df = df[(df[lat_col] >= 24) & (df[lat_col] <= 50) & 
                (df[lon_col] >= -125) & (df[lon_col] <= -66)]
        print(f"Filtered to CONUS: {len(df)} rows")
    
    # Process each time window
    for window in windows:
        start_year = window["start"]
        end_year = window["end"]
        
        # Filter data for this window
        window_data = df[(df['parsed_date'].dt.year >= start_year) & 
                        (df['parsed_date'].dt.year <= end_year)]
        
        if len(window_data) == 0:
            continue
        
        # Group by spatial cell
        if grid_type == "h3":
            window_data = window_data.copy()  # Avoid SettingWithCopyWarning
            window_data['cell_id'] = window_data.apply(
                lambda row: get_h3_cell(row[lat_col], row[lon_col], h3_resolution), axis=1
            )
        else:
            window_data = window_data.copy()  # Avoid SettingWithCopyWarning
            window_data['cell_id'] = window_data.apply(
                lambda row: get_bin_cell(row[lat_col], row[lon_col], bin_size), axis=1
            )
        
        # Aggregate by cell
        cell_counts = window_data.groupby('cell_id').agg({
            lat_col: 'mean',  # Use mean for cell centroid
            lon_col: 'mean',
            'cell_id': 'count'
        }).rename(columns={'cell_id': 'count'})
        
        # Create features for this window
        for cell_id, row in cell_counts.iterrows():
            feature = {
                "w": [int(start_year), int(end_year)],
                "lat": round(float(row[lat_col]), 6),
                "lon": round(float(row[lon_col]), 6),
                "n": int(row['count'])
            }
            
            if grid_type == "h3":
                feature["c"] = cell_id
            else:
                feature["bin_id"] = cell_id
            
            features.append(feature)
    
    return features


def main():
    parser = argparse.ArgumentParser(description="Preprocess US gun incidents for visualization")
    parser.add_argument("--csv", required=True, help="Path to input CSV file")
    parser.add_argument("--out", default="dist/aggregates.json", help="Output JSON file path")
    parser.add_argument("--grid", choices=["h3", "bin"], default="h3", help="Grid type")
    parser.add_argument("--h3-res", type=int, default=6, help="H3 resolution (higher = more detail)")
    parser.add_argument("--bin-size", type=float, default=0.1, help="Bin size for fallback grid")
    parser.add_argument("--years-per-window", type=int, default=3, help="Years per time window")
    parser.add_argument("--conus-only", action="store_true", help="Filter to continental US only")
    parser.add_argument("--max-size-mb", type=float, default=50.0, help="Maximum output size in MB")
    
    args = parser.parse_args()
    
    # Create output directory
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    
    print(f"Loading data from {args.csv}...")
    df = pd.read_csv(args.csv)
    print(f"Loaded {len(df)} rows")
    
    # Detect columns
    lat_col, lon_col, date_col = detect_columns(df)
    print(f"Using columns: lat={lat_col}, lon={lon_col}, date={date_col}")
    
    # Parse dates
    df['parsed_date'] = parse_date_column(df, date_col)
    valid_dates = df['parsed_date'].notna()
    print(f"Valid dates: {valid_dates.sum()}")
    
    # Filter out invalid coordinates
    valid_coords = df[lat_col].notna() & df[lon_col].notna()
    df = df[valid_dates & valid_coords]
    print(f"Valid rows: {len(df)}")
    
    # Determine grid type
    if args.grid == "h3" and not H3_AVAILABLE:
        print("H3 not available, switching to bin grid")
        args.grid = "bin"
    
    # Create time windows
    min_year = df['parsed_date'].dt.year.min()
    max_year = df['parsed_date'].dt.year.max()
    windows = create_time_windows(min_year, max_year, args.years_per_window)
    print(f"Created {len(windows)} time windows: {min_year}-{max_year}")
    
    # Aggregate data
    print("Aggregating incidents...")
    features = aggregate_incidents(df, lat_col, lon_col, windows, 
                                 args.grid, args.h3_res, args.bin_size, args.conus_only)
    
    # Check output size and adjust if needed
    output_data = {
        "meta": {
            "grid": args.grid,
            "resolution": args.h3_res if args.grid == "h3" else args.bin_size,
            "windows": windows
        },
        "features": features
    }
    
    # Convert numpy types to Python types for JSON serialization
    def convert_numpy_types(obj):
        if isinstance(obj, dict):
            return {k: convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_numpy_types(item) for item in obj]
        elif hasattr(obj, 'item'):  # numpy scalar
            return obj.item()
        else:
            return obj
    
    output_data = convert_numpy_types(output_data)
    
    # Serialize to check size
    json_bytes = orjson.dumps(output_data)
    size_mb = len(json_bytes) / (1024 * 1024)
    
    if size_mb > args.max_size_mb:
        print(f"Output size {size_mb:.1f}MB exceeds limit {args.max_size_mb}MB")
        if args.grid == "h3" and args.h3_res > 5:
            print("Reducing H3 resolution...")
            args.h3_res = max(5, args.h3_res - 1)
            features = aggregate_incidents(df, lat_col, lon_col, windows, 
                                         args.grid, args.h3_res, args.bin_size, args.conus_only)
            output_data["features"] = features
            output_data["meta"]["resolution"] = args.h3_res
            json_bytes = orjson.dumps(output_data)
            size_mb = len(json_bytes) / (1024 * 1024)
            print(f"New size: {size_mb:.1f}MB with resolution {args.h3_res}")
        elif args.grid == "bin" and args.bin_size < 0.2:
            print("Increasing bin size...")
            args.bin_size = min(0.2, args.bin_size * 2)
            features = aggregate_incidents(df, lat_col, lon_col, windows, 
                                         args.grid, args.h3_res, args.bin_size, args.conus_only)
            output_data["features"] = features
            output_data["meta"]["resolution"] = args.bin_size
            json_bytes = orjson.dumps(output_data)
            size_mb = len(json_bytes) / (1024 * 1024)
            print(f"New size: {size_mb:.1f}MB with bin size {args.bin_size}")
    
    # Write output
    with open(args.out, 'wb') as f:
        f.write(json_bytes)
    
    print(f"Output written to {args.out}")
    print(f"Final size: {size_mb:.1f}MB")
    print(f"Features: {len(features)}")
    print(f"Windows: {len(windows)}")
    print(f"Grid: {args.grid} (resolution: {output_data['meta']['resolution']})")


if __name__ == "__main__":
    main()

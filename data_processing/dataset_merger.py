#!/usr/bin/env python3
"""
Dataset Merger Script

Merges the 2019-2025 gun incident data with the existing 1985-2018 dataset.
The newer data has a different format, so we'll transform it to match the original structure.

Original format (1985-2018): Detailed victim demographics, circumstances, relationships
New format (2019-2025): Basic incident data with casualties but no victim details
"""

import pandas as pd
import numpy as np
from datetime import datetime
import re

def load_original_dataset():
    """Load the original 1985-2018 dataset"""
    print("Loading original dataset (1985-2018)...")
    df = pd.read_csv('/Users/kacemettahali/Desktop/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv')
    print(f"Original dataset: {len(df)} records from {df['year'].min()}-{df['year'].max()}")
    return df

def parse_incident_date(date_str):
    """Parse incident date string to extract year and month"""
    try:
        # Handle formats like "December 29, 2019"
        date_obj = pd.to_datetime(date_str)
        return date_obj.year, date_obj.month
    except:
        return None, None

def get_state_abbreviation(state_name):
    """Convert full state name to 2-letter abbreviation"""
    state_mapping = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
        'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
        'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
        'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
        'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
        'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
        'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
        'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
        'District of Columbia': 'DC'
    }
    return state_mapping.get(state_name, state_name)

def get_region_from_state(state_abbr):
    """Get region from state abbreviation"""
    regions = {
        'Northeast': ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
        'Southeast': ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV', 'DC'],
        'Midwest': ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
        'Southwest': ['AZ', 'NM', 'OK', 'TX'],
        'West': ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY']
    }
    
    for region, states in regions.items():
        if state_abbr in states:
            return region
    return 'Unknown'

def get_coordinates_for_state(state_abbr):
    """Get approximate state centroid coordinates"""
    # State centroids (approximate)
    state_coords = {
        'AL': (32.806671, -86.791130), 'AK': (61.370716, -152.404419), 'AZ': (33.729759, -111.431221),
        'AR': (34.969704, -92.373123), 'CA': (36.116203, -119.681564), 'CO': (39.059811, -105.311104),
        'CT': (41.767, -72.677), 'DE': (39.161921, -75.526755), 'FL': (27.4518, -81.5158),
        'GA': (32.9866, -83.6487), 'HI': (21.1098, -157.5311), 'ID': (44.2394, -114.5103),
        'IL': (40.3363, -89.0022), 'IN': (39.8647, -86.2604), 'IA': (42.0046, -93.214),
        'KS': (38.5111, -96.8005), 'KY': (37.669, -84.6514), 'LA': (31.1801, -91.8749),
        'ME': (44.323, -69.765), 'MD': (39.0724, -76.7902), 'MA': (42.2373, -71.5314),
        'MI': (43.3504, -84.5603), 'MN': (45.7326, -93.9196), 'MS': (32.7673, -89.6812),
        'MO': (38.4623, -92.302), 'MT': (47.052, -110.454), 'NE': (41.1289, -98.2883),
        'NV': (38.4199, -117.1219), 'NH': (43.4108, -71.5653), 'NJ': (40.314, -74.756),
        'NM': (34.8375, -106.2371), 'NY': (42.9538, -75.5268), 'NC': (35.630, -79.806),
        'ND': (47.5362, -99.793), 'OH': (40.367, -82.996), 'OK': (35.5376, -96.9247),
        'OR': (44.931, -120.767), 'PA': (40.269, -76.875), 'RI': (41.82355, -71.422132),
        'SC': (33.8191, -80.9066), 'SD': (44.2853, -99.4632), 'TN': (35.7449, -86.7489),
        'TX': (31.106, -97.6475), 'UT': (40.1135, -111.8535), 'VT': (44.0407, -72.7093),
        'VA': (37.768, -78.2057), 'WA': (47.3826, -121.5304), 'WV': (38.468, -80.9696),
        'WI': (44.2563, -89.6385), 'WY': (42.7475, -107.2085), 'DC': (38.8974, -77.0268)
    }
    return state_coords.get(state_abbr, (0, 0))

def transform_new_format_to_old(df_new, year):
    """Transform new format data to match original dataset structure"""
    print(f"Transforming {year} data ({len(df_new)} records)...")
    
    # Create records for each victim killed (focus on deaths like original dataset)
    records = []
    
    for _, row in df_new.iterrows():
        incident_id = row['Incident ID']
        date_str = row['Incident Date']
        state_full = row['State']
        city = row['City Or County']
        address = row['Address']
        killed = int(row['Victims Killed']) if pd.notna(row['Victims Killed']) else 0
        injured = int(row['Victims Injured']) if pd.notna(row['Victims Injured']) else 0
        
        # Skip incidents with no deaths (to match original dataset focus)
        if killed == 0:
            continue
            
        # Parse date
        year_parsed, month_parsed = parse_incident_date(date_str)
        if not year_parsed:
            year_parsed = year
            month_parsed = 1
        
        # Get state info
        state_abbr = get_state_abbreviation(state_full)
        region = get_region_from_state(state_abbr)
        lat, lon = get_coordinates_for_state(state_abbr)
        
        # Create records for killed victims
        for i in range(killed):
            records.append({
                'year': year_parsed,
                'month': month_parsed,
                'region': region,
                'state': state_abbr,
                'victim_age': np.nan,  # Not available in new format
                'victim_sex': 'Unknown',
                'victim_race': 'Unknown',
                'victim_race_plus_hispanic': 'Unknown',
                'victim_ethnicity': 'Unknown',
                'weapon_used': 'firearm',  # General assumption
                'victim_offender_split': 'Unknown',
                'offenders_relationship_to_victim': 'unknown',
                'offenders_relationship_to_victim_grouping': 'Unknown Relationship',
                'offender_sex': 'Unknown',
                'circumstance': 'Unknown',
                'circumstance_grouping': 'Unable to Determine Circumstances',
                'extra_circumstance_info': '',
                'multiple_victim_count': max(killed - 1, 0),
                'incident_id': incident_id,
                'additional_victim': i > 0,
                'Latitude': lat,
                'Longitude': lon,
                'Coordinate_Source': 'State_Centroid'
            })
    
    return pd.DataFrame(records)

def load_and_transform_new_datasets():
    """Load and transform all new datasets (2019-2025)"""
    print("Loading and transforming new datasets (2019-2025)...")
    
    new_datasets = []
    
    # Load 2019-2024 files
    for year in range(2019, 2025):
        file_path = f'/Users/kacemettahali/Desktop/pacify/data/{year}guns.csv'
        try:
            df = pd.read_csv(file_path)
            df_transformed = transform_new_format_to_old(df, year)
            new_datasets.append(df_transformed)
            print(f"  {year}: {len(df)} incidents -> {len(df_transformed)} death records")
        except Exception as e:
            print(f"  Error loading {year}: {e}")
    
    # Load 2025 file (different name)
    try:
        df_2025 = pd.read_csv('/Users/kacemettahali/Desktop/pacify/data/2025_deaths.csv')
        df_2025_transformed = transform_new_format_to_old(df_2025, 2025)
        new_datasets.append(df_2025_transformed)
        print(f"  2025: {len(df_2025)} incidents -> {len(df_2025_transformed)} death records")
    except Exception as e:
        print(f"  Error loading 2025: {e}")
    
    # Combine all new datasets
    if new_datasets:
        combined_new = pd.concat(new_datasets, ignore_index=True)
        print(f"Combined new datasets: {len(combined_new)} total death records")
        return combined_new
    else:
        return pd.DataFrame()

def merge_datasets():
    """Main function to merge all datasets"""
    print("=== DATASET MERGER ===\n")
    
    # Load original dataset
    original_df = load_original_dataset()
    
    # Load and transform new datasets
    new_df = load_and_transform_new_datasets()
    
    if new_df.empty:
        print("No new data to merge!")
        return
    
    # Align columns
    print("Aligning columns...")
    
    # Remove index column from original if it exists
    if 'Unnamed: 0' in original_df.columns:
        original_df = original_df.drop('Unnamed: 0', axis=1)
    
    # Get common columns and add missing ones
    original_cols = set(original_df.columns)
    new_cols = set(new_df.columns)
    
    # Add missing columns to new dataset
    for col in original_cols - new_cols:
        new_df[col] = np.nan
    
    # Reorder columns to match original
    new_df = new_df[original_df.columns]
    
    # Combine datasets
    print("Merging datasets...")
    combined_df = pd.concat([original_df, new_df], ignore_index=True)
    
    print(f"Final combined dataset: {len(combined_df)} records")
    print(f"Year range: {combined_df['year'].min()} - {combined_df['year'].max()}")
    
    # Add new index
    combined_df.insert(0, 'Unnamed: 0', range(len(combined_df)))
    
    # Save merged dataset
    output_path = '/Users/kacemettahali/Desktop/pacify/data/US_gun_deaths_1985-2025_with_coordinates.csv'
    combined_df.to_csv(output_path, index=False)
    print(f"Saved merged dataset to: {output_path}")
    
    # Print summary statistics
    print("\n=== SUMMARY STATISTICS ===")
    year_counts = combined_df['year'].value_counts().sort_index()
    print("Records by year:")
    for year, count in year_counts.items():
        print(f"  {year}: {count}")
    
    print(f"\nTotal records: {len(combined_df)}")
    print(f"Years covered: {combined_df['year'].min()} - {combined_df['year'].max()}")
    print(f"States covered: {len(combined_df['state'].unique())}")

if __name__ == "__main__":
    merge_datasets()

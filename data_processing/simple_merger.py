#!/usr/bin/env python3
"""
Simple Dataset Merger - Just concatenate all datasets together
"""

import pandas as pd
import numpy as np

def load_and_concat_new_datasets():
    """Load all 2019-2025 datasets and concatenate them"""
    print("Loading new datasets (2019-2025)...")
    
    datasets = []
    
    # Load 2019-2024 files
    for year in range(2019, 2025):
        file_path = f'/Users/kacemettahali/Desktop/pacify/data/{year}guns.csv'
        try:
            df = pd.read_csv(file_path)
            df['year'] = year  # Add year column
            datasets.append(df)
            print(f"  {year}: {len(df)} records")
        except Exception as e:
            print(f"  Error loading {year}: {e}")
    
    # Load 2025 file (different name)
    try:
        df_2025 = pd.read_csv('/Users/kacemettahali/Desktop/pacify/data/2025_deaths.csv')
        df_2025['year'] = 2025  # Add year column
        datasets.append(df_2025)
        print(f"  2025: {len(df_2025)} records")
    except Exception as e:
        print(f"  Error loading 2025: {e}")
    
    # Concatenate all new datasets
    if datasets:
        combined_new = pd.concat(datasets, ignore_index=True)
        print(f"Combined new datasets: {len(combined_new)} total records")
        return combined_new
    else:
        return pd.DataFrame()

def simple_merge():
    """Just save the datasets separately - they have different structures"""
    print("=== SIMPLE DATASET MERGER ===\n")
    
    # Load original dataset
    print("Loading original dataset (1985-2018)...")
    original_df = pd.read_csv('/Users/kacemettahali/Desktop/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv')
    print(f"Original dataset: {len(original_df)} records from {original_df['year'].min()}-{original_df['year'].max()}")
    
    # Load and combine new datasets
    new_df = load_and_concat_new_datasets()
    
    if new_df.empty:
        print("No new data to merge!")
        return
    
    # Save original dataset (unchanged)
    original_output = '/Users/kacemettahali/Desktop/pacify/data/gun_deaths_1985-2018_victim_level.csv'
    original_df.to_csv(original_output, index=False)
    print(f"Saved original dataset to: {original_output}")
    
    # Save new datasets (incident level)
    new_output = '/Users/kacemettahali/Desktop/pacify/data/gun_incidents_2019-2025_incident_level.csv'
    new_df.to_csv(new_output, index=False)
    print(f"Saved new datasets to: {new_output}")
    
    # Print summary
    print("\n=== SUMMARY ===")
    print(f"Original data (1985-2018): {len(original_df)} victim records")
    print(f"New data (2019-2025): {len(new_df)} incident records")
    print()
    print("Files created:")
    print(f"  - {original_output}")
    print(f"  - {new_output}")
    print()
    print("Note: These datasets have different structures:")
    print("  - Original: One row per victim with demographics")
    print("  - New: One row per incident with casualty counts and addresses")

if __name__ == "__main__":
    simple_merge()

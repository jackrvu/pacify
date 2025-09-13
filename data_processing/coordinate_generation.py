# Coordinate generation script for gun violence incident data
# Uses US Census Geocoding API to convert addresses to lat/lng coordinates
# Processes CSV files to add geographic coordinates for mapping visualization
import csv, requests, pathlib, pandas as pd
import time

def run_batch(csv_path, out_path):
    """Geocode addresses using the US Census Geocoding API"""
    with open(csv_path, 'rb') as f:
        files = {'addressFile': (pathlib.Path(csv_path).name, f, 'text/csv')}
        r = requests.post(
            'https://geocoding.geo.census.gov/geocoder/locations/addressbatch',
            params={'benchmark': 'Public_AR_Current', 'vintage': 'Current_Current'},
            files=files, timeout=120)
    r.raise_for_status()
    open(out_path, 'wb').write(r.content)

def process_2025_deaths():
    """Process 2025_deaths.csv to add latitude and longitude coordinates"""
    
    # Read the input CSV
    input_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/2025_deaths.csv'
    output_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/2025_with_locations.csv'
    
    print("Reading 2025_deaths.csv...")
    df = pd.read_csv(input_file)
    
    # Create a temporary CSV file with addresses for geocoding
    # The Census API expects: ID, Street Address, City, State, ZIP
    temp_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data_processing/temp_addresses.csv'
    
    print("Preparing addresses for geocoding...")
    with open(temp_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', 'Street Address', 'City', 'State', 'ZIP'])
        
        for idx, row in df.iterrows():
            # Create a unique ID for each row
            row_id = f"incident_{idx}"
            
            # Extract address components
            address = str(row['Address']) if pd.notna(row['Address']) else ''
            city = str(row['City Or County']) if pd.notna(row['City Or County']) else ''
            state = str(row['State']) if pd.notna(row['State']) else ''
            
            # Write to temp file
            writer.writerow([row_id, address, city, state, ''])
    
    print(f"Geocoding {len(df)} addresses...")
    print("This may take several minutes...")
    
    # Geocode the addresses
    geocoded_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data_processing/temp_geocoded.csv'
    run_batch(temp_file, geocoded_file)
    
    print("Processing geocoding results...")
    
    # Read the geocoded results
    try:
        geocoded_df = pd.read_csv(geocoded_file, names=['ID', 'Input Address', 'Match', 'Match Type', 'Matched Address', 'Coordinates', 'Tiger ID', 'Side'])
    except Exception as e:
        print(f"Error reading geocoded file: {e}")
        return
    
    # Extract latitude and longitude from coordinates
    geocoded_df['Latitude'] = ''
    geocoded_df['Longitude'] = ''
    
    for idx, row in geocoded_df.iterrows():
        coords = str(row['Coordinates'])
        if coords and coords != 'nan' and ',' in coords and coords != 'No_Match':
            try:
                # Coordinates are in format "longitude,latitude" (note the order)
                lon, lat = coords.split(',')
                geocoded_df.at[idx, 'Latitude'] = lat.strip()
                geocoded_df.at[idx, 'Longitude'] = lon.strip()
            except:
                geocoded_df.at[idx, 'Latitude'] = ''
                geocoded_df.at[idx, 'Longitude'] = ''
    
    # Merge the original data with geocoded results
    # Create a mapping from row index to geocoded data
    geocoded_dict = {}
    for idx, row in geocoded_df.iterrows():
        if row['ID'].startswith('incident_'):
            original_idx = int(row['ID'].split('_')[1])
            geocoded_dict[original_idx] = {
                'Latitude': row['Latitude'],
                'Longitude': row['Longitude'],
                'Match': row['Match'],
                'Matched Address': row['Matched Address']
            }
    
    # Add the geocoded columns to the original dataframe
    df['Latitude'] = ''
    df['Longitude'] = ''
    df['Geocoding Match'] = ''
    df['Matched Address'] = ''
    
    for idx in range(len(df)):
        if idx in geocoded_dict:
            df.at[idx, 'Latitude'] = geocoded_dict[idx]['Latitude']
            df.at[idx, 'Longitude'] = geocoded_dict[idx]['Longitude']
            df.at[idx, 'Geocoding Match'] = geocoded_dict[idx]['Match']
            df.at[idx, 'Matched Address'] = geocoded_dict[idx]['Matched Address']
    
    # Save the final result
    print(f"Saving results to {output_file}...")
    df.to_csv(output_file, index=False)
    
    # Clean up temporary files
    import os
    os.remove(temp_file)
    os.remove(geocoded_file)
    
    print(f"Processing complete! Results saved to {output_file}")
    print(f"Successfully geocoded {len(df[df['Latitude'] != ''])} out of {len(df)} addresses")

if __name__ == "__main__":
    process_2025_deaths()

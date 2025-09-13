import csv
import pandas as pd
import time

def get_state_coordinates():
    """Return a dictionary mapping state names to their approximate centroid coordinates"""
    return {
        'AL': {'lat': 32.806671, 'lon': -86.791130},  # Alabama
        'AK': {'lat': 61.370716, 'lon': -152.404419},  # Alaska
        'AZ': {'lat': 33.729759, 'lon': -111.431221},  # Arizona
        'AR': {'lat': 34.969704, 'lon': -92.373123},  # Arkansas
        'CA': {'lat': 36.116203, 'lon': -119.681564},  # California
        'CO': {'lat': 39.059811, 'lon': -105.311104},  # Colorado
        'CT': {'lat': 41.597782, 'lon': -72.755371},  # Connecticut
        'DE': {'lat': 39.318523, 'lon': -75.507141},  # Delaware
        'FL': {'lat': 27.766279, 'lon': -81.686783},  # Florida
        'GA': {'lat': 33.040619, 'lon': -83.643074},  # Georgia
        'HI': {'lat': 21.094318, 'lon': -157.498337},  # Hawaii
        'ID': {'lat': 44.240459, 'lon': -114.478828},  # Idaho
        'IL': {'lat': 40.349457, 'lon': -88.986137},  # Illinois
        'IN': {'lat': 39.849426, 'lon': -86.258278},  # Indiana
        'IA': {'lat': 42.011539, 'lon': -93.210526},  # Iowa
        'KS': {'lat': 38.526600, 'lon': -96.726486},  # Kansas
        'KY': {'lat': 37.668140, 'lon': -84.670067},  # Kentucky
        'LA': {'lat': 31.169546, 'lon': -91.867805},  # Louisiana
        'ME': {'lat': 44.323535, 'lon': -69.765261},  # Maine
        'MD': {'lat': 39.063946, 'lon': -76.802101},  # Maryland
        'MA': {'lat': 42.230171, 'lon': -71.530106},  # Massachusetts
        'MI': {'lat': 43.326618, 'lon': -84.536095},  # Michigan
        'MN': {'lat': 45.694454, 'lon': -93.900192},  # Minnesota
        'MS': {'lat': 32.741646, 'lon': -89.678696},  # Mississippi
        'MO': {'lat': 38.456085, 'lon': -92.288368},  # Missouri
        'MT': {'lat': 47.052632, 'lon': -110.454353},  # Montana
        'NE': {'lat': 41.125370, 'lon': -98.268082},  # Nebraska
        'NV': {'lat': 38.313515, 'lon': -117.055374},  # Nevada
        'NH': {'lat': 43.452492, 'lon': -71.563896},  # New Hampshire
        'NJ': {'lat': 40.298904, 'lon': -74.521011},  # New Jersey
        'NM': {'lat': 34.840515, 'lon': -106.248482},  # New Mexico
        'NY': {'lat': 42.165726, 'lon': -74.948051},  # New York
        'NC': {'lat': 35.630066, 'lon': -79.806419},  # North Carolina
        'ND': {'lat': 47.528912, 'lon': -99.784012},  # North Dakota
        'OH': {'lat': 40.388783, 'lon': -82.764915},  # Ohio
        'OK': {'lat': 35.565342, 'lon': -96.928917},  # Oklahoma
        'OR': {'lat': 43.804133, 'lon': -120.554201},  # Oregon
        'PA': {'lat': 40.590752, 'lon': -77.209755},  # Pennsylvania
        'RI': {'lat': 41.680893, 'lon': -71.51178},   # Rhode Island
        'SC': {'lat': 33.856892, 'lon': -80.945007},  # South Carolina
        'SD': {'lat': 44.299782, 'lon': -99.438828},  # South Dakota
        'TN': {'lat': 35.747845, 'lon': -86.692345},  # Tennessee
        'TX': {'lat': 31.054487, 'lon': -97.563461},  # Texas
        'UT': {'lat': 40.150032, 'lon': -111.862434},  # Utah
        'VT': {'lat': 44.045876, 'lon': -72.710686},  # Vermont
        'VA': {'lat': 37.769337, 'lon': -78.169968},  # Virginia
        'WA': {'lat': 47.400902, 'lon': -121.490494},  # Washington
        'WV': {'lat': 38.491226, 'lon': -80.954453},  # West Virginia
        'WI': {'lat': 44.268543, 'lon': -89.616508},  # Wisconsin
        'WY': {'lat': 41.145548, 'lon': -104.802042},  # Wyoming
        'DC': {'lat': 38.907192, 'lon': -77.036873},  # District of Columbia
    }

def add_random_offset(lat, lon, max_offset=0.5):
    """Add a small random offset to coordinates to avoid clustering at exact state centers"""
    import random
    # Add random offset between -max_offset and +max_offset degrees
    lat_offset = random.uniform(-max_offset, max_offset)
    lon_offset = random.uniform(-max_offset, max_offset)
    return lat + lat_offset, lon + lon_offset

def process_full_dataset():
    """Process the full US gun deaths dataset to add approximate coordinates based on state"""
    
    # File paths
    input_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018.csv'
    output_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv'
    
    print("Reading US_gun_deaths_1985-2018.csv...")
    print("This may take a moment due to the large file size...")
    
    # Read the CSV file in chunks to handle the large dataset
    chunk_size = 10000
    chunks = []
    
    try:
        for chunk in pd.read_csv(input_file, chunksize=chunk_size):
            chunks.append(chunk)
            if len(chunks) % 10 == 0:
                print(f"Processed {len(chunks) * chunk_size} rows...")
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # Combine all chunks
    print("Combining chunks...")
    df = pd.concat(chunks, ignore_index=True)
    
    print(f"Total rows loaded: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    
    # Get state coordinates mapping
    state_coords = get_state_coordinates()
    
    # Add coordinate columns
    df['Latitude'] = ''
    df['Longitude'] = ''
    df['Coordinate_Source'] = 'State_Centroid'
    
    print("Adding coordinates based on state...")
    
    # Process each row
    for idx, row in df.iterrows():
        if idx % 50000 == 0:
            print(f"Processing row {idx}...")
        
        state = str(row['state']).strip()
        
        if state in state_coords:
            # Get state centroid coordinates
            base_lat = state_coords[state]['lat']
            base_lon = state_coords[state]['lon']
            
            # Add small random offset to avoid clustering
            lat, lon = add_random_offset(base_lat, base_lon, max_offset=0.3)
            
            df.at[idx, 'Latitude'] = round(lat, 6)
            df.at[idx, 'Longitude'] = round(lon, 6)
        else:
            # Handle unknown states
            df.at[idx, 'Latitude'] = ''
            df.at[idx, 'Longitude'] = ''
            df.at[idx, 'Coordinate_Source'] = 'Unknown_State'
    
    # Save the result
    print(f"Saving results to {output_file}...")
    df.to_csv(output_file, index=False)
    
    # Print summary statistics
    successful_coords = len(df[df['Latitude'] != ''])
    total_rows = len(df)
    
    print(f"\nProcessing complete!")
    print(f"Results saved to: {output_file}")
    print(f"Successfully added coordinates to {successful_coords} out of {total_rows} rows")
    print(f"Success rate: {(successful_coords/total_rows)*100:.2f}%")
    
    # Show state distribution
    print(f"\nState distribution (top 10):")
    state_counts = df['state'].value_counts().head(10)
    for state, count in state_counts.items():
        print(f"  {state}: {count:,} incidents")

def process_sample_dataset(sample_size=10000):
    """Process a sample of the dataset for testing purposes"""
    
    input_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018.csv'
    output_file = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_sample_with_coordinates.csv'
    
    print(f"Reading sample of {sample_size} rows from US_gun_deaths_1985-2018.csv...")
    
    # Read a sample of the data
    df = pd.read_csv(input_file, nrows=sample_size)
    
    print(f"Sample rows loaded: {len(df)}")
    
    # Get state coordinates mapping
    state_coords = get_state_coordinates()
    
    # Add coordinate columns
    df['Latitude'] = ''
    df['Longitude'] = ''
    df['Coordinate_Source'] = 'State_Centroid'
    
    print("Adding coordinates based on state...")
    
    # Process each row
    for idx, row in df.iterrows():
        state = str(row['state']).strip()
        
        if state in state_coords:
            # Get state centroid coordinates
            base_lat = state_coords[state]['lat']
            base_lon = state_coords[state]['lon']
            
            # Add small random offset to avoid clustering
            lat, lon = add_random_offset(base_lat, base_lon, max_offset=0.3)
            
            df.at[idx, 'Latitude'] = round(lat, 6)
            df.at[idx, 'Longitude'] = round(lon, 6)
        else:
            # Handle unknown states
            df.at[idx, 'Latitude'] = ''
            df.at[idx, 'Longitude'] = ''
            df.at[idx, 'Coordinate_Source'] = 'Unknown_State'
    
    # Save the result
    print(f"Saving sample results to {output_file}...")
    df.to_csv(output_file, index=False)
    
    # Print summary statistics
    successful_coords = len(df[df['Latitude'] != ''])
    total_rows = len(df)
    
    print(f"\nSample processing complete!")
    print(f"Results saved to: {output_file}")
    print(f"Successfully added coordinates to {successful_coords} out of {total_rows} rows")
    print(f"Success rate: {(successful_coords/total_rows)*100:.2f}%")

if __name__ == "__main__":
    print("US Gun Deaths Dataset Coordinate Generation")
    print("==========================================")
    print()
    print("This program adds approximate coordinates to the full US gun deaths dataset")
    print("based on state information. Since the dataset doesn't contain specific")
    print("addresses, coordinates are assigned to state centroids with small random")
    print("offsets to avoid clustering.")
    print()
    
    # Ask user if they want to process the full dataset or a sample
    choice = input("Process full dataset (y) or sample (n)? [y/n]: ").lower().strip()
    
    if choice == 'n':
        sample_size = input("Enter sample size (default 10000): ").strip()
        try:
            sample_size = int(sample_size) if sample_size else 10000
        except ValueError:
            sample_size = 10000
        process_sample_dataset(sample_size)
    else:
        print("\nWARNING: Processing the full dataset may take several minutes")
        print("and will create a large output file.")
        confirm = input("Continue with full dataset processing? [y/n]: ").lower().strip()
        if confirm == 'y':
            process_full_dataset()
        else:
            print("Processing cancelled.")


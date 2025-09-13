# Coordinate display modification script - adds formatted coordinate display and Google Maps links
# Processes historical gun violence data to include user-friendly coordinate formatting
# Adds Google Maps links for easy location lookup
import pandas as pd
import os

def modify_1995_2018_data():
    """Modify 1995-2018 data to show coordinates instead of addresses with Google Maps links"""
    
    input_file = '/Users/kacemettahali/Desktop/pacify/frontend/public/data/US_gun_deaths_1985-2018_with_coordinates.csv'
    output_file = '/Users/kacemettahali/Desktop/pacify/frontend/public/data/US_gun_deaths_1985-2018_with_coordinates.csv'
    
    print("Reading 1995-2018 data...")
    df = pd.read_csv(input_file)
    
    print(f"Processing {len(df)} records...")
    
    # Create a new column for coordinate display
    df['Coordinate_Display'] = ''
    df['Google_Maps_Link'] = ''
    
    for idx, row in df.iterrows():
        lat = row['Latitude']
        lng = row['Longitude']
        
        # Check if coordinates are valid
        if pd.notna(lat) and pd.notna(lng) and lat != 0 and lng != 0:
            # Format coordinates for display
            coord_display = f"{lat:.6f}, {lng:.6f}"
            df.at[idx, 'Coordinate_Display'] = coord_display
            
            # Create Google Maps link
            google_maps_link = f"https://www.google.com/maps?q={lat},{lng}"
            df.at[idx, 'Google_Maps_Link'] = google_maps_link
        else:
            df.at[idx, 'Coordinate_Display'] = 'Coordinates not available'
            df.at[idx, 'Google_Maps_Link'] = ''
    
    # Save the modified data
    print(f"Saving modified data to {output_file}...")
    df.to_csv(output_file, index=False)
    
    print(f"Successfully processed {len(df[df['Coordinate_Display'] != 'Coordinates not available'])} records with coordinates")

def modify_2019_2025_data():
    """Modify 2019-2025 data to show coordinates instead of addresses with Google Maps links"""
    
    data_dir = '/Users/kacemettahali/Desktop/pacify/frontend/public/data'
    
    # Process each year's data
    for year in range(2019, 2026):
        filename = f'incidents_{year}.csv'
        filepath = os.path.join(data_dir, filename)
        
        if os.path.exists(filepath):
            print(f"Processing {filename}...")
            df = pd.read_csv(filepath)
            
            # Create new columns for coordinate display
            df['Coordinate_Display'] = ''
            df['Google_Maps_Link'] = ''
            
            for idx, row in df.iterrows():
                # Check if Latitude and Longitude columns exist and have valid data
                if 'Latitude' in df.columns and 'Longitude' in df.columns:
                    lat = row['Latitude']
                    lng = row['Longitude']
                    
                    if pd.notna(lat) and pd.notna(lng) and lat != 0 and lng != 0:
                        # Format coordinates for display
                        coord_display = f"{lat:.6f}, {lng:.6f}"
                        df.at[idx, 'Coordinate_Display'] = coord_display
                        
                        # Create Google Maps link
                        google_maps_link = f"https://www.google.com/maps?q={lat},{lng}"
                        df.at[idx, 'Google_Maps_Link'] = google_maps_link
                    else:
                        df.at[idx, 'Coordinate_Display'] = 'Coordinates not available'
                        df.at[idx, 'Google_Maps_Link'] = ''
                else:
                    # If no coordinates available, show address
                    address = row.get('Address', 'Address not available')
                    df.at[idx, 'Coordinate_Display'] = address
                    df.at[idx, 'Google_Maps_Link'] = ''
            
            # Save the modified data
            df.to_csv(filepath, index=False)
            print(f"Successfully processed {filename}")
        else:
            print(f"File {filename} not found, skipping...")

if __name__ == "__main__":
    print("Modifying data to show coordinates instead of addresses...")
    print("=" * 50)
    
    # Modify 1995-2018 data
    print("\n1. Processing 1995-2018 data...")
    modify_1995_2018_data()
    
    # Modify 2019-2025 data
    print("\n2. Processing 2019-2025 data...")
    modify_2019_2025_data()
    
    print("\n" + "=" * 50)
    print("Data modification complete!")

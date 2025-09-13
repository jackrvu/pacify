# County mapping script for gun violence incident data
# Maps lat/lng coordinates to US counties using shapefile data
# Adds county information to incident datasets for choropleth visualization
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import os
import warnings
warnings.filterwarnings('ignore')

def map_coordinates_to_counties():
    """
    Map coordinates from incident data to counties using the US counties shapefile.
    This function will add county information to all incident datasets.
    """
    
    # Paths
    data_dir = '/Users/kacemettahali/Desktop/pacify/frontend/public/data'
    shapefile_path = os.path.join(data_dir, 'tl_2024_us_county.shp')
    
    print("Loading US counties shapefile...")
    
    # Check if shapefile exists and has all required components
    required_files = ['.shp', '.shx', '.dbf', '.prj']
    missing_files = []
    
    for ext in required_files:
        file_path = shapefile_path.replace('.shp', ext)
        if not os.path.exists(file_path):
            missing_files.append(ext)
    
    if missing_files:
        print(f"Error: Missing shapefile components: {missing_files}")
        print("A complete shapefile requires: .shp, .shx, .dbf, and .prj files")
        return False
    
    # Load the counties shapefile
    try:
        counties_gdf = gpd.read_file(shapefile_path)
        print(f"Loaded {len(counties_gdf)} counties from shapefile")
        print(f"Columns available: {list(counties_gdf.columns)}")
        
        # Ensure the shapefile is in the correct coordinate reference system
        if counties_gdf.crs is None:
            counties_gdf.crs = 'EPSG:4326'  # WGS84
        elif counties_gdf.crs != 'EPSG:4326':
            counties_gdf = counties_gdf.to_crs('EPSG:4326')
        
    except Exception as e:
        print(f"Error loading shapefile: {e}")
        return False
    
    # Process each incident dataset
    datasets_to_process = [
        'gun_incidents_2019-2025_incident_level.csv',
        'US_gun_deaths_1985-2018_with_coordinates.csv',
        '2025_with_locations.csv'
    ]
    
    # Add individual year files
    for year in range(2019, 2026):
        datasets_to_process.append(f'incidents_{year}.csv')
    
    for dataset_name in datasets_to_process:
        dataset_path = os.path.join(data_dir, dataset_name)
        
        if not os.path.exists(dataset_path):
            print(f"Skipping {dataset_name} - file not found")
            continue
        
        print(f"\nProcessing {dataset_name}...")
        
        try:
            # Read the incident data
            df = pd.read_csv(dataset_path)
            print(f"Loaded {len(df)} incidents")
            
            # Check if coordinates exist
            if 'Latitude' not in df.columns or 'Longitude' not in df.columns:
                print(f"No coordinate columns found in {dataset_name}, skipping...")
                continue
            
            # Filter out rows without valid coordinates
            valid_coords = df.dropna(subset=['Latitude', 'Longitude'])
            valid_coords = valid_coords[(valid_coords['Latitude'] != 0) & (valid_coords['Longitude'] != 0)]
            
            print(f"Found {len(valid_coords)} incidents with valid coordinates")
            
            if len(valid_coords) == 0:
                print("No valid coordinates found, skipping...")
                continue
            
            # Create Point geometries from coordinates
            geometry = [Point(xy) for xy in zip(valid_coords['Longitude'], valid_coords['Latitude'])]
            incidents_gdf = gpd.GeoDataFrame(valid_coords, geometry=geometry, crs='EPSG:4326')
            
            # Perform spatial join to get county information
            print("Performing spatial join with counties...")
            incidents_with_counties = gpd.sjoin(incidents_gdf, counties_gdf, how='left', predicate='within')
            
            # Add county information to the original dataframe
            df['County_Name'] = ''
            df['County_FIPS'] = ''
            df['State_FIPS'] = ''
            df['County_State'] = ''
            
            # Map the county information back to the original dataframe
            # Handle potential duplicate indices by using the first match
            county_mapping = {}
            for idx, row in incidents_with_counties.iterrows():
                original_idx = row.name  # This is the original index from valid_coords
                if original_idx not in county_mapping:
                    county_mapping[original_idx] = {
                        'NAME': row.get('NAME', ''),
                        'COUNTYFP': row.get('COUNTYFP', ''),
                        'STATEFP': row.get('STATEFP', '')
                    }
            
            for idx, row in df.iterrows():
                if idx in county_mapping:
                    county_info = county_mapping[idx]
                    df.at[idx, 'County_Name'] = county_info.get('NAME', '')
                    df.at[idx, 'County_FIPS'] = county_info.get('COUNTYFP', '')
                    df.at[idx, 'State_FIPS'] = county_info.get('STATEFP', '')
                    
                    # Create a combined county-state field
                    county_name = county_info.get('NAME', '')
                    state_fips = county_info.get('STATEFP', '')
                    
                    if county_name and state_fips:
                        # Get state name from FIPS code (you might want to add a state lookup)
                        df.at[idx, 'County_State'] = f"{county_name}, {state_fips}"
            
            # Save the updated dataset
            output_path = dataset_path.replace('.csv', '_with_counties.csv')
            df.to_csv(output_path, index=False)
            
            print(f"Successfully processed {dataset_name}")
            print(f"Added county information to {len(df[df['County_Name'] != ''])} incidents")
            print(f"Results saved to: {output_path}")
            
        except Exception as e:
            print(f"Error processing {dataset_name}: {e}")
            continue
    
    print("\nCounty mapping complete!")
    return True

def create_county_summary():
    """
    Create a summary of incidents by county
    """
    data_dir = '/Users/kacemettahali/Desktop/pacify/frontend/public/data'
    
    print("\nCreating county incident summary...")
    
    # Find all datasets with county information
    county_datasets = []
    for file in os.listdir(data_dir):
        if file.endswith('_with_counties.csv'):
            county_datasets.append(os.path.join(data_dir, file))
    
    if not county_datasets:
        print("No datasets with county information found. Run map_coordinates_to_counties() first.")
        return
    
    # Combine all datasets
    all_incidents = []
    for dataset_path in county_datasets:
        try:
            df = pd.read_csv(dataset_path)
            df['source_file'] = os.path.basename(dataset_path)
            all_incidents.append(df)
        except Exception as e:
            print(f"Error reading {dataset_path}: {e}")
    
    if not all_incidents:
        print("No valid datasets found.")
        return
    
    combined_df = pd.concat(all_incidents, ignore_index=True)
    
    # Create county summary
    county_summary = combined_df.groupby(['County_Name', 'State_FIPS']).agg({
        'Incident ID': 'count',
        'Victims Killed': 'sum',
        'Victims Injured': 'sum',
        'Suspects Killed': 'sum',
        'Suspects Injured': 'sum'
    }).reset_index()
    
    county_summary.columns = ['County_Name', 'State_FIPS', 'Total_Incidents', 
                             'Total_Victims_Killed', 'Total_Victims_Injured',
                             'Total_Suspects_Killed', 'Total_Suspects_Injured']
    
    # Sort by total incidents
    county_summary = county_summary.sort_values('Total_Incidents', ascending=False)
    
    # Save summary
    summary_path = os.path.join(data_dir, 'county_incident_summary.csv')
    county_summary.to_csv(summary_path, index=False)
    
    print(f"County summary saved to: {summary_path}")
    print(f"Top 10 counties by incident count:")
    print(county_summary.head(10)[['County_Name', 'State_FIPS', 'Total_Incidents']].to_string(index=False))

def add_county_to_timeline_data():
    """
    Add county information to the timeline data used by the frontend
    """
    data_dir = '/Users/kacemettahali/Desktop/pacify/frontend/public/data'
    
    print("\nAdding county information to timeline data...")
    
    # Process the main incident dataset that's used by the frontend
    main_dataset = os.path.join(data_dir, 'gun_incidents_2019-2025_incident_level.csv')
    
    if os.path.exists(main_dataset):
        df = pd.read_csv(main_dataset)
        
        # Check if county information already exists
        if 'County_Name' in df.columns:
            print("County information already exists in the dataset")
            return
        
        # Load counties shapefile
        shapefile_path = os.path.join(data_dir, 'tl_2024_us_county.shp')
        counties_gdf = gpd.read_file(shapefile_path)
        
        if counties_gdf.crs != 'EPSG:4326':
            counties_gdf = counties_gdf.to_crs('EPSG:4326')
        
        # Filter valid coordinates
        valid_coords = df.dropna(subset=['Latitude', 'Longitude'])
        valid_coords = valid_coords[(valid_coords['Latitude'] != 0) & (valid_coords['Longitude'] != 0)]
        
        # Add county columns
        df['County_Name'] = ''
        df['County_FIPS'] = ''
        df['State_FIPS'] = ''
        df['County_State'] = ''
        
        # Create Point geometries and perform spatial join
        geometry = [Point(xy) for xy in zip(valid_coords['Longitude'], valid_coords['Latitude'])]
        incidents_gdf = gpd.GeoDataFrame(valid_coords, geometry=geometry, crs='EPSG:4326')
        incidents_with_counties = gpd.sjoin(incidents_gdf, counties_gdf, how='left', predicate='within')
        
        # Map county information back to original dataframe
        # Handle potential duplicate indices by using the first match
        county_mapping = {}
        for idx, row in incidents_with_counties.iterrows():
            original_idx = row.name  # This is the original index from valid_coords
            if original_idx not in county_mapping:
                county_mapping[original_idx] = {
                    'NAME': row.get('NAME', ''),
                    'COUNTYFP': row.get('COUNTYFP', ''),
                    'STATEFP': row.get('STATEFP', '')
                }
        
        for idx, row in df.iterrows():
            if idx in county_mapping:
                county_info = county_mapping[idx]
                df.at[idx, 'County_Name'] = county_info.get('NAME', '')
                df.at[idx, 'County_FIPS'] = county_info.get('COUNTYFP', '')
                df.at[idx, 'State_FIPS'] = county_info.get('STATEFP', '')
                
                county_name = county_info.get('NAME', '')
                state_fips = county_info.get('STATEFP', '')
                if county_name and state_fips:
                    df.at[idx, 'County_State'] = f"{county_name}, {state_fips}"
        
        # Save the updated dataset
        df.to_csv(main_dataset, index=False)
        print(f"Successfully added county information to {len(df[df['County_Name'] != ''])} incidents")
        print(f"Updated dataset saved to: {main_dataset}")

if __name__ == "__main__":
    print("Mapping coordinates to counties using geopandas...")
    print("=" * 60)
    
    # Map coordinates to counties
    success = map_coordinates_to_counties()
    
    if success:
        # Create county summary
        create_county_summary()
        
        # Add county info to timeline data
        add_county_to_timeline_data()
    
    print("\n" + "=" * 60)
    print("County mapping process complete!")

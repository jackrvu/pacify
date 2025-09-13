# Year batching script - splits gun violence data into year-specific CSV files
# Processes the main dataset and creates individual files for each year (1985-2018)
# Used for efficient data loading in the frontend timeline visualization
import pandas as pd
import os

# Create processed_data directory if it doesn't exist
processed_data_dir = '/Users/jackvu/Desktop/latex_projects/hackathon/pacify/processed_data'
if not os.path.exists(processed_data_dir):
    os.makedirs(processed_data_dir)

# Read the main CSV file containing historical gun death data
df = pd.read_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv')

# Group by year and save separate files for efficient loading
for year in df['year'].unique():
    year_df = df[df['year'] == year]
    output_file = os.path.join(processed_data_dir, f'incidents_{year}.csv')
    year_df.to_csv(output_file, index=False)
    print(f"Created file for year {year}: {output_file}")

print("Finished creating year-specific CSV files")

# Main data processing script for gun violence incident data
# Reads historical gun death data (1985-2018) and provides basic statistics
import pandas as pd

# Read the CSV file containing historical gun death data
df = pd.read_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018.csv')

# Get and print the number of incidents (rows) in the dataset
num_incidents = len(df)
print(f"Total number of gun-related incidents: {num_incidents}")

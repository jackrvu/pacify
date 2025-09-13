import pandas as pd

# Read the CSV file
df = pd.read_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018.csv')

# Get and print the number of incidents (rows)
num_incidents = len(df)
print(f"Total number of gun-related incidents: {num_incidents}")

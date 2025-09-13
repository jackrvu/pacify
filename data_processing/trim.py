import pandas as pd

# Read the CSV file
df = pd.read_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv')

# Filter for years >= 1990
df = df[df['year'] >= 1990]

# Save the filtered data back to CSV
df.to_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv', index=False)

print("Data before 1990 has been removed from the CSV file")

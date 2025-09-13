# Data trimming script - filters gun violence data to focus on recent years
# Removes data before 1995 to focus on more recent and reliable incident records
# Used to reduce dataset size and improve visualization performance
import pandas as pd

# Read the CSV file containing historical gun death data
df = pd.read_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv')

# Filter for years >= 1995 (remove older data for better quality)
df = df[df['year'] >= 1995]

# Save the filtered data back to CSV
df.to_csv('/Users/jackvu/Desktop/latex_projects/hackathon/pacify/data/US_gun_deaths_1985-2018_with_coordinates.csv', index=False)

print("Data before 1995 has been removed from the CSV file")

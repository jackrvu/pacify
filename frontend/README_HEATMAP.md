# Incident Heatmap Feature

This document describes the incident heatmap functionality that has been added to the Pacify frontend.

## Features

### Heatmap Visualization
- **Data Source**: Uses `2025_with_locations.csv` which contains pre-geocoded incident data
- **Color Gradient**: Yellow → Orange → Red → Dark Red (based on incident severity)
- **Intensity Calculation**: Based on victims killed and injured (killed × 2 + injured × 0.5 + 0.1)
- **Filtering**: Only displays incidents with successful geocoding matches (excludes "No_Match" entries)

### Interactive Modal
- **Click Interaction**: Click on any area of the heatmap to see nearby incidents
- **Incident Details**: Each incident shows:
  - Location (City, State)
  - Date
  - Address and matched address
  - Casualty counts (Killed/Injured)
  - Suspect information (if available)
- **Severity Color Coding**: Badges color-coded by total casualties
- **Responsive Design**: Modal positioned near click location with scrollable content

### Technical Implementation
- **Heatmap Library**: Uses Leaflet.heat for rendering
- **Data Processing**: Filters incidents with valid coordinates and geocoding matches
- **Click Detection**: Finds incidents within ~1km radius of click location
- **Modal Management**: Handles click-outside-to-close and proper positioning

## Usage

1. The heatmap loads automatically when the application starts
2. Toggle the heatmap layer using the controls panel
3. Click anywhere on the heatmap to see incident details
4. Click outside the modal or the × button to close

## Data Requirements

The CSV file must contain these columns:
- `Latitude`, `Longitude`: Valid coordinates
- `Geocoding Match`: Must be "Match" for incidents to appear
- `Incident Date`, `State`, `City Or County`, `Address`: Basic incident info
- `Victims Killed`, `Victims Injured`: For severity calculation
- `Suspects Killed`, `Suspects Injured`, `Suspects Arrested`: Optional suspect info
- `Matched Address`: Optional geocoded address

## Styling

The modal uses custom CSS classes defined in `IncidentModal.css` for:
- Clean, modern appearance
- Hover effects on incident items
- Color-coded severity badges
- Custom scrollbar styling
- Responsive layout

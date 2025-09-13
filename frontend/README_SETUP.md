# Pacify Frontend Setup

## Google Places API Setup

To enable geocoding functionality for incident locations, you need to set up a Google Places API key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Geocoding API
   - Places API
4. Create credentials (API Key)
5. Restrict the API key to your domain for security
6. Create a `.env` file in the frontend directory with:
   ```
   REACT_APP_GOOGLE_PLACES_API_KEY=your_actual_api_key_here
   ```

## Features Implemented

- **Fullscreen Map**: The map now takes up the entire screen (100vh x 100vw)
- **Automatic Data Loading**: Incident data is loaded automatically on component mount
- **Heat Map Visualization**: Incidents are visualized as heat maps based on their coordinates
- **Google Places Integration**: Addresses are geocoded using the Google Places API
- **Batch Processing**: Geocoding is done in batches to respect API rate limits
- **Loading Indicators**: Shows progress while geocoding incidents

## Data Format

The application expects a CSV file with the following columns:
- `Incident ID`
- `Incident Date`
- `State`
- `City Or County`
- `Address`
- `Victims Killed`
- `Victims Injured`
- `Suspects Killed`
- `Suspects Injured`
- `Suspects Arrested`
- `Operations`

## Running the Application

1. Install dependencies: `npm install`
2. Set up your `.env` file with the Google Places API key
3. Start the development server: `npm start`
4. The application will automatically load the incident data and display it as a heat map

## Heat Map Configuration

The heat map uses the following configuration:
- **Radius**: 25px
- **Blur**: 15px
- **Gradient**: Blue → Cyan → Lime → Yellow → Red
- **Intensity**: Based on victims killed + injured + 1

The heat map will only appear when the "Heat Map Layer" toggle is enabled in the controls overlay.

# Pacify Frontend Setup Instructions

## Issues Fixed

1. **CORS and API Rate Limiting**: Added proxy server to handle OpenStreetMap Nominatim API requests
2. **Data Path Issues**: Fixed CSV file loading paths
3. **Missing Dependencies**: Added required packages
4. **Error Handling**: Improved geocoding error handling and retry logic
5. **Performance**: Added progress indicators and better batch processing

## Setup Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start the Proxy Server (Required for Geocoding)
In one terminal:
```bash
npm run proxy-server
```
This will start the proxy server on http://localhost:3001

### 3. Start the React App
In another terminal:
```bash
npm start
```
This will start the React app on http://localhost:3000

## How It Works

1. **Proxy Server**: Handles CORS issues and rate limiting for the OpenStreetMap Nominatim API
2. **Geocoding**: Converts addresses to coordinates with proper error handling and retry logic
3. **Rate Limiting**: Respects the 1 request per second limit with delays between requests
4. **Progress Tracking**: Shows geocoding progress with a visual indicator
5. **Error Recovery**: Automatically retries failed requests up to 2 times

## Troubleshooting

### If you see "Failed to load resource: net::ERR_CONNECTION_REFUSED":
1. Make sure the proxy server is running on port 3001
2. Check that both servers are running (proxy on 3001, React on 3000)

### If geocoding is slow:
- This is expected due to rate limiting (1 request per second)
- The app will show a progress indicator
- Consider using pre-geocoded data for better performance

### If you see CORS errors:
- Make sure you're using the proxy server
- Check that the proxy server is running on the correct port

## Performance Notes

- Geocoding is intentionally slow to respect API rate limits
- The app processes incidents in small batches (5 at a time)
- Consider pre-processing data with coordinates for production use
- The heatmap will only show incidents that have been successfully geocoded

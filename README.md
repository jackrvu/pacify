# Pacify - Gun Violence Data Visualization

A comprehensive web application for visualizing gun violence incidents across the United States from 1995-2025.

## Features

- **Interactive Map Visualization**: County-level choropleth maps and incident heatmaps
- **Timeline Navigation**: Browse incidents by year with smooth transitions
- **Policy Timeline**: View gun policy changes by state over time
- **Incident Details**: Detailed information panels with nearby incident data
- **Multiple Data Sources**: Combines historical (1985-2018) and recent (2019-2025) datasets

## Architecture

- **Frontend**: React.js with Leaflet maps and D3.js visualizations
- **Data Processing**: Python scripts for data cleaning, geocoding, and county mapping
- **Data Sources**: Multiple CSV datasets with gun violence incident records

## Quick Start

1. Install dependencies: `npm install` (frontend) and `pip install -r requirements.txt` (data processing)
2. Start the development server: `npm start` (frontend)
3. Access the application at `http://localhost:3000`

## Data Processing

The `data_processing/` directory contains Python scripts for:
- Geocoding addresses to coordinates
- Mapping incidents to counties
- Merging multiple datasets
- Creating year-specific data files

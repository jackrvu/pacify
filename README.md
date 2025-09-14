# Pacify - Gun Violence Data Visualization & Policy Analysis Platform

A comprehensive web application for visualizing gun violence incidents and analyzing gun policy changes across the United States from 2019-2025, powered by AI analysis and interactive visualizations.

## Features

- **Interactive Map Visualization**: County-level choropleth maps and incident heatmaps across all 50 states and 3,143 counties
- **AI-Powered Policy Analysis**: Google Gemini 2.5 Pro analyzes gun policies with constitutional interpretation and impact assessment
- **Policy Timeline Browser**: Interactive timeline showing enacted policies chronologically with detailed analysis
- **Real-time News Integration**: Current gun violence coverage with geographic correlation and sentiment analysis
- **State-Specific Analysis**: Focus on individual states with filtered policy and incident data
- **Bookmark System**: Save and manage policies of interest for further analysis

## Architecture

- **Frontend**: React.js with Leaflet maps, interactive timeline components, and modern UI
- **AI Analysis**: Google Gemini 2.5 Pro for policy analysis and interpretation
- **Data Processing**: Python scripts for data cleaning, geocoding, and county mapping
- **Data Sources**: 
  - Gun Violence Archive (50k+ incidents, 2019-2025)
  - RAND Corporation gun policy database (filtered for recent policies)
  - News API for real-time news coverage

## Quick Start

1. Install dependencies: `npm install` (frontend) and `pip install -r requirements.txt` (data processing)
2. Start the development server: `npm start` (frontend)
3. Access the application at `http://localhost:3000`

## AI-Powered Analysis

The platform uses Google Gemini 2.5 Pro to provide:
- **Policy Interpretation**: Constitutional analysis and legal impact assessment
- **Mass Shooting Analysis**: Correlation between policy changes and mass shooting incidents
- **State Statistics**: Comprehensive mass shooting statistics by state (2019-2025)
- **Human-Readable Explanations**: Complex policy language translated into accessible summaries

## Data Processing

The `data_processing/` directory contains Python scripts for:
- Geocoding addresses to coordinates
- Mapping incidents to counties
- Merging multiple datasets
- Creating year-specific data files
- AI analysis integration and policy processing

## Data Scope & Limitations

- **Time Range**: Analysis focuses on recent data (2019-2025) for current policy relevance
- **Data Filtering**: Uses filtered datasets rather than complete historical records
- **Geographic Coverage**: All 50 states and 3,143 counties
- **Policy Focus**: Recent gun policy changes with AI-powered analysis
- **Incident Data**: ~50k gun violence incidents from Gun Violence Archive

## Project Context

Built for Johns Hopkins University's Hophacks 2025 (Marshall Wace Data Visualization Track), applying quantitative analysis techniques to public policy challenges.

## Key Statistics

- **50k+** gun violence incidents analyzed (2019-2025)
- **2,500+** policy records with AI analysis
- **3,143** counties mapped and visualized
- **6 years** of comprehensive data coverage

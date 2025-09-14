# MediaCloud API Setup Guide

## Overview

The Media tab in the Policy Analysis section provides real-time gun violence news coverage using the MediaCloud API with RSS feed fallback.

## Features

- **Real-time News**: Latest gun violence and gun control articles
- **State-specific News**: Filter news by selected state
- **Policy-related News**: News related to specific gun policies
- **Multiple Sources**: MediaCloud API + RSS feed fallback
- **External Links**: Direct links to full articles

## Setup Instructions

### Option 1: MediaCloud API (Recommended)

1. **Get MediaCloud API Key**:
   - Visit [MediaCloud API](https://mediacloud.org/)
   - Sign up for an account
   - Request API access
   - Copy your API key

2. **Configure Environment**:
   Create a `.env` file in the `frontend/` directory:
   ```bash
   REACT_APP_MEDIACLOUD_API_KEY=your_actual_api_key_here
   ```

3. **Restart Development Server**:
   ```bash
   cd frontend
   npm start
   ```

### Option 2: RSS Fallback (No API Key Required)

If you don't have a MediaCloud API key, the system will automatically use RSS feeds from:
- Google News
- Reuters
- Associated Press

No additional setup required - it works out of the box!

## Usage

1. **Open Policy Analysis**: Click on any state to view policies
2. **Select Policy**: Click on a policy marker to open details
3. **Access Media Tab**: Click the "📰 Media" tab in Analysis Tools
4. **Choose News Source**:
   - **Recent**: Latest gun violence news
   - **State**: News specific to the selected state
   - **Policy**: News related to the current policy
5. **Read Articles**: Click "🔗 Read Full Article" to open in new tab

## News Sources

### With MediaCloud API:
- Comprehensive news database
- Advanced filtering and search
- Higher article count and quality
- Real-time updates

### With RSS Fallback:
- Google News RSS feeds
- Reuters top news
- Associated Press feeds
- Automatic gun violence filtering

## Troubleshooting

### "No articles found"
- Try refreshing the news
- Switch to "Recent" news source
- Check internet connection

### "API key not configured"
- Add `REACT_APP_MEDIACLOUD_API_KEY` to `.env` file
- Restart development server
- System will use RSS fallback automatically

### Slow loading
- RSS fallback may be slower than MediaCloud API
- Try reducing the number of articles requested
- Check network connection

## Technical Details

- **API Endpoint**: `https://api.mediacloud.org/api/v2/stories_public/list`
- **CORS Proxy**: Uses `api.allorigins.win` for RSS feeds
- **Article Filtering**: Automatic filtering for gun violence content
- **State Detection**: Geographic filtering based on article content
- **Cache**: No caching - always fetches fresh data

## Security Notes

- Never commit your `.env` file to version control
- MediaCloud API key should be kept secure
- RSS feeds are publicly accessible
- External links open in new tabs for security

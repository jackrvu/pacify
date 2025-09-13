# Gemini API Setup Instructions

## 1. Get Your API Key
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

## 2. Create Environment File
Create a `.env` file in the `pacify` directory with the following content:

```
GEMINI_API_KEY=your-actual-api-key-here
```

Replace `your-actual-api-key-here` with the API key you obtained in step 1.

## 3. Run the Script
```bash
cd /Users/jackvu/Desktop/latex_projects/hackathon/pacify/data_processing
python state_gun_violence_context_generator.py
```

## Output
The script will generate:
- `state_gun_violence_context.json` - Main output with context for all 50 states
- `state_context_progress.json` - Progress tracking (allows resuming if interrupted)
- `state_context_summary.json` - Summary statistics

## Features
- Uses Gemini 2.0 Flash Thinking with search capabilities
- Generates ~2 paragraphs per state (300-400 words)
- Includes rate limiting to respect API limits
- Progress tracking allows resuming interrupted runs
- Comprehensive error handling

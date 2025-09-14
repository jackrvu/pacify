# Gemini API Setup Guide

## Getting Started with AI Analysis

To use the AI-powered policy analysis features, you'll need to set up Google's Gemini API.

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 2: Configure Your Environment

Create a `.env` file in the `frontend/` directory:

```bash
# Gemini API Configuration
REACT_APP_GEMINI_API_KEY=your_actual_api_key_here
```

**Important**: Replace `your_actual_api_key_here` with your actual API key from Step 1.

### Step 3: Restart Development Server

After adding the API key, restart your development server:

```bash
cd frontend
npm start
```

### Step 4: Test the Integration

1. Open the application
2. Click on any state to view policies
3. Click on a policy marker to open the policy modal
4. Bookmark the policy (click the star)
5. Click "🤖 AI Analysis" to test the Gemini integration

## Features Available with Gemini

- **Safety Impact Analysis**: Get insights on policy safety implications
- **Constitutional Analysis**: Understand legal considerations
- **Effectiveness Assessment**: Analyze policy effectiveness
- **Custom Questions**: Ask specific questions about policies
- **Mass Shooting Context**: AI analysis of policy impact on mass shootings

## Troubleshooting

### "Gemini API key not configured" Error
- Make sure you've created the `.env` file in the `frontend/` directory
- Verify the API key is correct and starts with `AIzaSy`
- Restart the development server after adding the API key

### "Analysis failed" Error
- Check your internet connection
- Verify the API key is valid and has proper permissions
- Check the browser console for detailed error messages

### API Quota Exceeded
- Gemini API has usage limits
- Check your quota in the Google AI Studio dashboard
- Consider upgrading your plan if needed

## Security Notes

- Never commit your `.env` file to version control
- Keep your API key secure and don't share it publicly
- The API key is only used for AI analysis features
- All other data is stored locally in your browser

## Cost Information

- Gemini API offers free tier with limited usage
- Check current pricing at [Google AI Studio](https://makersuite.google.com/)
- Usage is typically very low for individual users

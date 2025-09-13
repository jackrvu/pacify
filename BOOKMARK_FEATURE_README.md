# Policy Bookmarking Feature

## Overview
The policy bookmarking feature allows users to save interesting gun policies for later analysis, add personal annotations, and get AI-powered insights using Google's Gemini API.

## Features

### 📚 Bookmarking
- **Bookmark Policies**: Click the star (☆) button in any policy modal to bookmark it
- **View Bookmarks**: Access your bookmarked policies in the Analytics Dashboard
- **Remove Bookmarks**: Unbookmark policies you no longer need

### 📝 Annotations
- **Add Notes**: Write personal notes about policies
- **Ask Questions**: Mark annotations as questions for later research
- **Record Insights**: Save important insights about policy impacts
- **AI Integration**: Include Gemini AI responses in your annotations

### 🤖 AI Analysis
- **Safety Impact Analysis**: Get AI insights on policy safety implications
- **Constitutional Analysis**: Understand constitutional considerations
- **Effectiveness Assessment**: Analyze policy effectiveness
- **Custom Questions**: Ask specific questions about policies

### 📊 Dashboard Management
- **Filter Bookmarks**: Filter by policy type (restrictive/permissive)
- **Search Policies**: Search through bookmarked policies
- **Export/Import**: Export bookmarks as JSON files
- **View Annotations**: See all your annotations in one place

## How to Use

### Bookmarking a Policy
1. Click on any state on the map to open the policy timeline
2. Click on a policy marker to view policy details
3. Click the star (☆) button in the policy modal header
4. The star will turn gold (★) indicating the policy is bookmarked

### Adding Annotations
1. Open a bookmarked policy (star will be gold)
2. Click "📝 Annotations" to open the annotation panel
3. Select annotation type (Note, Question, or Insight)
4. Write your annotation and click "Add Annotation"

### Using AI Analysis
1. Open a bookmarked policy
2. Click "🤖 AI Analysis" to open the AI panel
3. Use quick action buttons for common analyses:
   - 🛡️ Safety Impact
   - ⚖️ Constitutional
   - 📊 Effectiveness
4. Or ask a custom question in the text input

### Managing Bookmarks
1. Open the Analytics Dashboard (resizable tab on the right)
2. Click "📚 Bookmarks" to switch to bookmark view
3. Use filters and search to find specific policies
4. Click "View Details" to see full policy information
5. Click "Remove" to unbookmark a policy

## Technical Details

### Data Storage
- Bookmarks are stored in browser localStorage
- Data persists between sessions
- Export/import functionality for data portability

### AI Integration
- Uses Google Gemini API for policy analysis
- Requires API key configuration
- Fallback behavior when API is unavailable

### File Structure
```
frontend/src/
├── utils/
│   ├── bookmarkService.js    # Bookmark CRUD operations
│   └── geminiService.js      # AI analysis integration
├── components/
│   ├── PolicyModal.js        # Enhanced with bookmark features
│   └── AnalyticsDashboard.js # Bookmark management interface
```

## API Configuration

To use AI analysis features, you need to configure the Gemini API:

1. Get a Gemini API key from Google AI Studio
2. Set the environment variable: `REACT_APP_GEMINI_API_KEY=your_api_key_here`
3. Restart the development server

## Data Format

### Bookmark Structure
```json
{
  "id": "bookmark_1234567890",
  "law_id": "AL1053",
  "state": "Alabama",
  "law_class": "carrying a concealed weapon (ccw)",
  "effect": "Permissive",
  "effective_date": "2023-1-1",
  "original_content": "Policy text...",
  "human_explanation": "AI explanation...",
  "mass_shooting_analysis": "Impact analysis...",
  "state_mass_shooting_stats": {...},
  "bookmarked_at": "2025-01-13T10:00:00.000Z",
  "annotations": [
    {
      "id": "annotation_1234567890",
      "content": "User's note",
      "type": "note",
      "created_at": "2025-01-13T10:00:00.000Z",
      "gemini_response": "AI response if applicable"
    }
  ]
}
```

## Browser Compatibility
- Modern browsers with localStorage support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers supported

## Privacy & Security
- All data stored locally in browser
- No data sent to external servers (except Gemini API)
- API key should be kept secure
- Export functionality allows data backup

// Gemini Service - Handles AI-powered policy analysis and insights
// Provides intelligent analysis of gun policies using Google's Gemini API

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyBvOkBwJcE2lQjf8nM3pO7rS9tU1vW4xY6'; // Replace with actual API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

// Analyze policy with Gemini
export const analyzePolicyWithGemini = async (policy, question = null) => {
    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'AIzaSyBvOkBwJcE2lQjf8nM3pO7rS9tU1vW4xY6') {
            return {
                success: false,
                message: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY in your environment.'
            };
        }

        const prompt = buildAnalysisPrompt(policy, question);
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const analysis = data.candidates[0].content.parts[0].text;
            
            return {
                success: true,
                analysis,
                timestamp: new Date().toISOString()
            };
        } else {
            throw new Error('Invalid response format from Gemini API');
        }
    } catch (error) {
        console.error('Error analyzing policy with Gemini:', error);
        return {
            success: false,
            message: `Analysis failed: ${error.message}`
        };
    }
};

// Build analysis prompt based on policy and question
const buildAnalysisPrompt = (policy, question) => {
    const basePrompt = `You are a gun policy analyst with expertise in firearms legislation, public safety, and constitutional law. Analyze the following gun policy and provide insights.

Policy Details:
- State: ${policy.state}
- Law Class: ${policy.law_class}
- Effect: ${policy.effect}
- Effective Date: ${policy.effective_date}
- Original Content: ${policy.original_content}
- Human Explanation: ${policy.human_explanation}

Mass Shooting Context:
${policy.mass_shooting_analysis}

State Statistics (2019-2025):
- Total Mass Shootings: ${policy.state_mass_shooting_stats?.total_2019_2025 || 'N/A'}
- Average per Year: ${policy.state_mass_shooting_stats?.avg_per_year || 'N/A'}
- Total Victims Killed: ${policy.state_mass_shooting_stats?.total_victims_killed || 'N/A'}
- Total Victims Injured: ${policy.state_mass_shooting_stats?.total_victims_injured || 'N/A'}`;

    if (question) {
        return `${basePrompt}

Specific Question: ${question}

Please provide a focused analysis addressing this specific question while considering the broader policy context.`;
    } else {
        return `${basePrompt}

IMPORTANT: You MUST format your response using these exact section headers:

## Policy Summary
## Constitutional Analysis  
## Safety Impact
## State Context
## Key Takeaways

For each section:
- Use bullet points (•) for lists
- Keep each section to 2-3 sentences maximum
- Be purposeful and actionable
- Do NOT write long paragraphs
- Do NOT use bold text or other formatting

Example format:
## Policy Summary
• Meaningful overview of what this policy does
• Key mechanism of the law

## Constitutional Analysis
• Second Amendment considerations
• Due Process implications

Follow this exact structure.`;
    }
};

// Get policy insights for common questions
export const getPolicyInsights = async (policy, insightType) => {
    const questions = {
        'safety_impact': 'What are the potential safety implications of this policy change?',
        'constitutional': 'What constitutional considerations are relevant to this policy?',
        'effectiveness': 'How effective might this policy be in achieving its intended goals?',
        'comparison': 'How does this policy compare to similar policies in other states?',
        'unintended': 'What unintended consequences might this policy have?',
        'implementation': 'What challenges might arise in implementing this policy?'
    };

    const question = questions[insightType] || questions['safety_impact'];
    return await analyzePolicyWithGemini(policy, question);
};

// Check if Gemini is available
export const isGeminiAvailable = () => {
    return GEMINI_API_KEY && GEMINI_API_KEY !== 'AIzaSyBvOkBwJcE2lQjf8nM3pO7rS9tU1vW4xY6';
};

// Get API key status
export const getApiKeyStatus = () => {
    if (!GEMINI_API_KEY) {
        return { status: 'missing', message: 'No API key found' };
    } else if (GEMINI_API_KEY === 'AIzaSyBvOkBwJcE2lQjf8nM3pO7rS9tU1vW4xY6') {
        return { status: 'placeholder', message: 'Using placeholder API key' };
    } else {
        return { status: 'configured', message: 'API key is configured' };
    }
};

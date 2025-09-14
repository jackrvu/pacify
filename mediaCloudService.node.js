// MediaCloud Service - Node.js version for CSV generation
// Handles news aggregation and gun violence media coverage
// Provides real-time news data using MediaCloud API and fallback RSS feeds

const fetch = require('node-fetch');
const { DOMParser } = require('xmldom');

const MEDIACLOUD_API_KEY = process.env.REACT_APP_MEDIACLOUD_API_KEY || null;
const ARTICLES_API = process.env.REACT_APP_ARTICLES_API || null;
const ARTICLES_API_KEY = process.env.REACT_APP_ARTICLES_API_KEY || null;
const ARTICLES_GET_API = process.env.REACT_APP_ARTICLES_GET_API || null;
const ARTICLES_PROCESS_MARK_API = process.env.REACT_APP_ARTICLES_PROCESS_MARK_API || null;

// Debug logging
console.log('MEDIACLOUD_API_KEY loaded:', MEDIACLOUD_API_KEY ? 'Present' : 'Missing');

// Parse CSV data to articles array
const parseCSVToArticles = (csvData) => {
    try {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        const articles = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple CSV parsing (handles quoted fields)
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            if (values.length >= headers.length) {
                const article = {};
                headers.forEach((header, index) => {
                    article[header.trim()] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
                });
                
                // Filter for gun violence related content
                const title = article.title || '';
                const description = article.description || '';
                const gunKeywords = ['gun', 'shooting', 'firearm', 'violence', 'mass shooting', 'ice', 'kirk'];
                const hasGunContent = gunKeywords.some(keyword => 
                    title.toLowerCase().includes(keyword) || 
                    description.toLowerCase().includes(keyword)
                );
                
                if (hasGunContent) {
                    articles.push(article);
                }
            }
        }
        
        return articles;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
};

// Search for gun violence news using custom Articles API
const searchGunViolenceNews = async (state = null, maxArticles = 25, daysBack = 180) => {
    try {
        console.log(`Searching for gun violence news for the past ${daysBack} days using custom Articles API...`);
        
        // Try custom Articles API first
        const customResult = await searchNewsViaCustomAPI(state, maxArticles, daysBack);
        if (customResult.success && customResult.articles.length > 0) {
            return customResult;
        }
        
        // Fall back to RSS feeds if custom API fails or returns no results
        console.log('Custom API returned no results, falling back to RSS feeds');
        return await searchNewsViaRSS(state, maxArticles, daysBack);
        
    } catch (error) {
        console.error('Error searching for news:', error);
        // Fall back to RSS if all APIs fail
        return await searchNewsViaRSS(state, maxArticles, daysBack);
    }
};

// Search using custom Articles API
const searchNewsViaCustomAPI = async (state = null, maxArticles = 25, daysBack = 180) => {
    try {
        // Check if required environment variables are available
        if (!ARTICLES_GET_API || !ARTICLES_API_KEY) {
            throw new Error('Custom Articles API not configured - missing environment variables');
        }

        // Calculate date range for the past 6 months (180 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - daysBack);

        // Build query parameters
        const queryParams = new URLSearchParams({
            limit: maxArticles.toString(),
            query: 'gun violence OR gun control OR shooting OR firearms',
            start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
            end_date: endDate.toISOString().split('T')[0]     // YYYY-MM-DD format
        });
        
        if (state) {
            queryParams.append('state', state);
        }

        const response = await fetch(`${ARTICLES_GET_API}?${queryParams}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${ARTICLES_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Articles API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle AWS Lambda response format with CSV body
        let articles = [];
        if (data.body) {
            // Parse CSV data from AWS Lambda response
            const csvData = data.body;
            articles = parseCSVToArticles(csvData);
        } else if (data.articles && Array.isArray(data.articles)) {
            articles = data.articles;
        } else if (data.data && Array.isArray(data.data)) {
            articles = data.data;
        } else if (Array.isArray(data)) {
            articles = data;
        } else {
            console.warn('Unexpected API response format:', data);
            return { success: false, articles: [], message: 'Unexpected API response format' };
        }

        // Transform articles to consistent format
        const transformedArticles = articles.map(article => ({
            title: article.title || article.headline || 'No title',
            link: article.url || article.link || '',
            published: article.date || article.publish_date || article.created_at || '',
            summary: article.description || article.summary || article.content || '',
            source: getSourceDomain(article.url || article.link || '') || 'Unknown source',
            content: article.description || article.content || article.text || '',
            id: article.id || article.article_id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        }));

        return {
            success: true,
            articles: transformedArticles,
            total: transformedArticles.length,
            timestamp: new Date().toISOString(),
            source: 'Custom Articles API'
        };
        
    } catch (error) {
        console.error('Error with custom Articles API:', error);
        return {
            success: false,
            articles: [],
            message: `Custom API error: ${error.message}`,
            timestamp: new Date().toISOString()
        };
    }
};

// Fallback RSS news search
const searchNewsViaRSS = async (state = null, maxArticles = 25, daysBack = 180) => {
    try {
        const articles = [];
        
        // RSS feed URLs for gun violence news with date range
        const rssUrls = [
            `https://news.google.com/rss/search?q=gun+violence&hl=en-US&gl=US&ceid=US:en&when=${daysBack}d`,
            'https://feeds.reuters.com/reuters/topNews',
            'https://feeds.apnews.com/rss/apf-topnews'
        ];

        for (const rssUrl of rssUrls) {
            try {
                // Use a CORS proxy for RSS feeds
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
                const response = await fetch(proxyUrl);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
                
                const items = xmlDoc.getElementsByTagName('item');
                
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (articles.length >= maxArticles) break;
                    
                    const titleEl = item.getElementsByTagName('title')[0];
                    const linkEl = item.getElementsByTagName('link')[0];
                    const pubDateEl = item.getElementsByTagName('pubDate')[0];
                    const descEl = item.getElementsByTagName('description')[0];
                    
                    const title = titleEl ? titleEl.textContent : '';
                    const link = linkEl ? linkEl.textContent : '';
                    const published = pubDateEl ? pubDateEl.textContent : '';
                    const description = descEl ? descEl.textContent : '';
                    
                    // Filter by date - only include articles from the past 6 months
                    if (published) {
                        const articleDate = new Date(published);
                        const cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                        
                        if (articleDate < cutoffDate) {
                            continue; // Skip articles older than 6 months
                        }
                    }
                    
                    // Filter by state if specified
                    if (state && !title.toLowerCase().includes(state.toLowerCase()) && 
                        !description.toLowerCase().includes(state.toLowerCase())) {
                        continue;
                    }
                    
                    // Filter for gun violence related content
                    const gunKeywords = ['gun', 'shooting', 'firearm', 'violence', 'mass shooting'];
                    const hasGunContent = gunKeywords.some(keyword => 
                        title.toLowerCase().includes(keyword) || 
                        description.toLowerCase().includes(keyword)
                    );
                    
                    if (hasGunContent) {
                        articles.push({
                            title: title,
                            link: link,
                            published: published,
                            summary: description,
                            source: 'RSS Feed',
                            content: description,
                            id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        });
                    }
                }
            } catch (rssError) {
                console.error('Error fetching RSS feed:', rssUrl, rssError);
                continue;
            }
        }

        return {
            success: true,
            articles: articles.slice(0, maxArticles),
            total: articles.length,
            timestamp: new Date().toISOString(),
            source: 'RSS Fallback'
        };
    } catch (error) {
        console.error('Error in RSS fallback:', error);
        return {
            success: false,
            articles: [],
            total: 0,
            message: `News search failed: ${error.message}`,
            timestamp: new Date().toISOString()
        };
    }
};

// Get news for a specific state (past 6 months)
const getStateNews = async (state, maxArticles = 15) => {
    if (!state) {
        return {
            success: false,
            message: 'State parameter is required'
        };
    }

    return await searchGunViolenceNews(state, maxArticles, 180);
};

// Get recent gun violence news for the past 6 months (no state filter)
const getRecentGunViolenceNews = async (maxArticles = 20) => {
    return await searchGunViolenceNews(null, maxArticles, 180);
};

// Get gun violence news for the past 6 months (explicit function)
const getSixMonthGunViolenceNews = async (state = null, maxArticles = 50) => {
    console.log('Fetching gun violence news for the past 6 months...');
    return await searchGunViolenceNews(state, maxArticles, 180);
};

// Check if Custom Articles API is available
const isCustomArticlesAvailable = () => {
    return ARTICLES_GET_API !== null && ARTICLES_API_KEY !== null;
};

// Check if MediaCloud is available
const isMediaCloudAvailable = () => {
    return MEDIACLOUD_API_KEY !== null;
};

// Get API status
const getMediaCloudStatus = () => {
    if (isCustomArticlesAvailable()) {
        return { 
            status: 'custom_api', 
            message: 'Custom Articles API configured' 
        };
    } else if (isMediaCloudAvailable()) {
        return { 
            status: 'mediacloud', 
            message: 'MediaCloud API configured' 
        };
    } else {
        return { 
            status: 'rss_fallback', 
            message: 'Using RSS feed fallback (no API keys configured)' 
        };
    }
};

// Format article date for display
const formatArticleDate = (dateString) => {
    try {
        if (!dateString) return 'No date';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
};

// Extract domain from URL for source display
const getSourceDomain = (url) => {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch (error) {
        return 'Unknown source';
    }
};

module.exports = {
    searchGunViolenceNews,
    getStateNews,
    getRecentGunViolenceNews,
    getSixMonthGunViolenceNews,
    isCustomArticlesAvailable,
    isMediaCloudAvailable,
    getMediaCloudStatus,
    formatArticleDate,
    getSourceDomain
};

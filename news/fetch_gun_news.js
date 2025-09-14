#!/usr/bin/env node

/**
 * Gun Violence News Fetcher
 * Fetches gun violence news data for the past 6 months and saves to CSV
 */

const fs = require('fs');
const path = require('path');

// Mock the browser environment for Node.js
global.fetch = require('node-fetch');
global.DOMParser = require('xmldom').DOMParser;

// Import the mediaCloudService functions
const { 
    getSixMonthGunViolenceNews, 
    getStateNews, 
    getMediaCloudStatus,
    formatArticleDate,
    getSourceDomain 
} = require('./mediaCloudService.node.js');

// Configuration
const CONFIG = {
    maxArticlesPerBatch: 100,
    maxTotalArticles: 1000,
    delayBetweenBatches: 2000, // 2 seconds
    outputDir: './news_data',
    csvFileName: 'gun_violence_news_6months.csv'
};

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Convert articles to CSV format
 */
function articlesToCSV(articles) {
    if (!articles || articles.length === 0) {
        return 'title,link,published,summary,source,content,id\n';
    }

    const headers = ['title', 'link', 'published', 'summary', 'source', 'content', 'id'];
    const csvRows = [headers.join(',')];

    articles.forEach(article => {
        const row = headers.map(header => {
            let value = article[header] || '';
            // Escape quotes and wrap in quotes if contains comma
            value = value.toString().replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
}

/**
 * Append articles to CSV file
 */
function appendToCSV(articles, filePath) {
    const csvContent = articlesToCSV(articles);
    const needsHeader = !fs.existsSync(filePath);
    
    if (needsHeader) {
        fs.writeFileSync(filePath, csvContent);
    } else {
        // Remove header from content and append
        const lines = csvContent.split('\n');
        const dataLines = lines.slice(1); // Skip header
        fs.appendFileSync(filePath, '\n' + dataLines.join('\n'));
    }
}

/**
 * Sleep function for delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch news data in batches
 */
async function fetchNewsInBatches(states = null, maxArticles = CONFIG.maxTotalArticles) {
    const allArticles = [];
    const seenIds = new Set();
    let batchCount = 0;
    
    console.log(`🚀 Starting to fetch gun violence news for the past 6 months...`);
    console.log(`📊 Target: ${maxArticles} articles`);
    console.log(`📍 States: ${states ? states.join(', ') : 'All states'}`);
    console.log('');

    // Check API status
    const apiStatus = getMediaCloudStatus();
    console.log(`🔗 API Status: ${apiStatus.status} - ${apiStatus.message}`);
    console.log('');

    try {
        while (allArticles.length < maxArticles && batchCount < 10) { // Max 10 batches
            batchCount++;
            const remainingArticles = maxArticles - allArticles.length;
            const batchSize = Math.min(CONFIG.maxArticlesPerBatch, remainingArticles);
            
            console.log(`📦 Batch ${batchCount}: Fetching ${batchSize} articles...`);
            
            let result;
            if (states && states.length > 0) {
                // Fetch for specific states
                const state = states[batchCount % states.length];
                console.log(`   🏛️  Fetching for state: ${state}`);
                result = await getStateNews(state, batchSize);
            } else {
                // Fetch general news
                result = await getSixMonthGunViolenceNews(null, batchSize);
            }
            
            if (result.success && result.articles) {
                const newArticles = result.articles.filter(article => {
                    const id = article.id || article.title || article.link;
                    if (seenIds.has(id)) {
                        return false; // Skip duplicates
                    }
                    seenIds.add(id);
                    return true;
                });
                
                allArticles.push(...newArticles);
                console.log(`   ✅ Found ${newArticles.length} new articles (Total: ${allArticles.length})`);
                console.log(`   📡 Source: ${result.source}`);
                
                if (newArticles.length === 0) {
                    console.log(`   ⚠️  No new articles found, stopping...`);
                    break;
                }
            } else {
                console.log(`   ❌ Batch failed: ${result.message || 'Unknown error'}`);
            }
            
            // Delay between batches to be respectful to APIs
            if (allArticles.length < maxArticles && batchCount < 10) {
                console.log(`   ⏳ Waiting ${CONFIG.delayBetweenBatches/1000}s before next batch...`);
                await sleep(CONFIG.delayBetweenBatches);
            }
        }
        
        console.log('');
        console.log(`🎉 Fetching complete! Total articles: ${allArticles.length}`);
        return allArticles;
        
    } catch (error) {
        console.error('❌ Error during fetching:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    const startTime = new Date();
    console.log('='.repeat(60));
    console.log('🔫 GUN VIOLENCE NEWS FETCHER');
    console.log('📅 Fetching data for the past 6 months');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        const maxArticles = parseInt(args[0]) || CONFIG.maxTotalArticles;
        const states = args.slice(1).length > 0 ? args.slice(1) : null;
        
        // Fetch articles
        const articles = await fetchNewsInBatches(states, maxArticles);
        
        if (articles.length === 0) {
            console.log('❌ No articles found. Exiting...');
            return;
        }
        
        // Generate CSV
        const csvPath = path.join(CONFIG.outputDir, CONFIG.csvFileName);
        console.log(`📝 Generating CSV file: ${csvPath}`);
        
        const csvContent = articlesToCSV(articles);
        fs.writeFileSync(csvPath, csvContent);
        
        // Generate summary
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('');
        console.log('='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`📄 Total articles: ${articles.length}`);
        console.log(`📁 Output file: ${csvPath}`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📅 Date range: Past 6 months`);
        
        // Show sample articles
        if (articles.length > 0) {
            console.log('');
            console.log('📰 Sample articles:');
            articles.slice(0, 3).forEach((article, index) => {
                console.log(`   ${index + 1}. ${article.title}`);
                console.log(`      📅 ${formatArticleDate(article.published)}`);
                console.log(`      🌐 ${article.source}`);
                console.log('');
            });
        }
        
        console.log('✅ CSV file generated successfully!');
        
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { fetchNewsInBatches, articlesToCSV };

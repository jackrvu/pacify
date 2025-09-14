import React, { useState, useEffect, useRef } from 'react';
import { 
    getSixMonthGunViolenceNews, 
    getStateNews, 
    getMediaCloudStatus, 
    formatArticleDate, 
    getSourceDomain 
} from '../utils/mediaCloudService';
import './BookmarkMediaTab.css';

// Helper function to strip HTML tags
const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
};

const BookmarkMediaTab = ({ selectedState, selectedPolicy }) => {
    const [articles, setArticles] = useState([]);
    const [allArticles, setAllArticles] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [articlesPerPage, setArticlesPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastUpdated, setLastUpdated] = useState(null);
    const articlesListRef = useRef(null);

    // Load news data from CSV file
    const loadNewsData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Load the comprehensive CSV data
            const response = await fetch(`/data/comprehensive_gun_news_20250914_023757_cleaned.csv?v=${Date.now()}&cleaned=true`);
            if (!response.ok) {
                throw new Error('Failed to load news data');
            }
            
            const csvText = await response.text();
            console.log('CSV loaded, length:', csvText.length);
            const lines = csvText.split('\n');
            console.log('Number of lines:', lines.length);
            const headers = lines[0].split(',');
            console.log('Headers:', headers);
            
            const loadedArticles = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Simple CSV parsing
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
                    
                    // Extract source from title if not available in media_name
                    let source = article.media_name || '';
                    if (!source && article.title) {
                        // Try to extract source from title (format: "Title - Source")
                        const titleParts = article.title.split(' - ');
                        if (titleParts.length > 1) {
                            source = titleParts[titleParts.length - 1].trim();
                        }
                    }
                    
                    // Clean up the title by removing the source part
                    let cleanTitle = article.title || 'No title';
                    if (source && cleanTitle.includes(' - ')) {
                        cleanTitle = cleanTitle.replace(` - ${source}`, '').trim();
                    }
                    
                    // Clean up the summary by removing URLs, source, and redundant content
                    let cleanSummary = stripHtmlTags(article.summary || '');
                    
                    // Remove URLs from summary
                    cleanSummary = cleanSummary.replace(/https?:\/\/[^\s]+/g, '').trim();
                    
                    // Remove source if it's appended
                    if (source && cleanSummary.includes(source)) {
                        cleanSummary = cleanSummary.replace(source, '').trim();
                    }
                    
                    // Remove extra whitespace and clean up
                    cleanSummary = cleanSummary.replace(/\s+/g, ' ').trim();
                    
                    // If summary is identical to title or empty, set it to empty
                    if (cleanSummary === cleanTitle || cleanSummary.length < 10) {
                        cleanSummary = '';
                    }
                    
                    // Transform to consistent format
                    const transformedArticle = {
                        title: cleanTitle,
                        link: article.url || article.link || '',
                        published: article.publish_date || article.published || '',
                        summary: cleanSummary,
                        source: source || 'Unknown source',
                        content: stripHtmlTags(article.content || article.summary || ''),
                        id: article.story_id || article.id || `article_${i}`,
                        state: article.state || ''
                    };
                    
                    loadedArticles.push(transformedArticle);
                }
            }
            
            console.log('Loaded articles:', loadedArticles.length);
            setAllArticles(loadedArticles);
            setLastUpdated(new Date());
            
        } catch (err) {
            setError(`Error loading news data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort articles based on state
    const filterAndSortArticles = () => {
        let filtered = [...allArticles];
        
        // Filter by state if selected
        if (selectedState) {
            filtered = filtered.filter(article => 
                article.title.toLowerCase().includes(selectedState.toLowerCase()) ||
                article.summary.toLowerCase().includes(selectedState.toLowerCase()) ||
                article.content.toLowerCase().includes(selectedState.toLowerCase())
            );
        }
        
        // Sort by date (most recent first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.published);
            const dateB = new Date(b.published);
            return dateB - dateA;
        });
        
        setFilteredArticles(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    };

    // Calculate total pages
    const totalPages = filteredArticles.length > 0 ? Math.ceil(filteredArticles.length / articlesPerPage) : 1;

    // Initial load
    useEffect(() => {
        loadNewsData();
    }, []);

    // Update articles when filters change
    useEffect(() => {
        if (allArticles.length > 0) {
            filterAndSortArticles();
        }
    }, [allArticles, selectedState]);

    // Update displayed articles when page or articles per page changes
    useEffect(() => {
        if (filteredArticles.length === 0) return;
        
        const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        
        // Ensure current page is within valid range
        const validCurrentPage = Math.min(currentPage, totalPages);
        if (validCurrentPage !== currentPage) {
            setCurrentPage(validCurrentPage);
            return;
        }
        
        const startIndex = (currentPage - 1) * articlesPerPage;
        const endIndex = startIndex + articlesPerPage;
        const currentArticles = filteredArticles.slice(startIndex, endIndex);
        
        console.log('Updating articles:', {
            currentPage,
            articlesPerPage,
            filteredArticlesLength: filteredArticles.length,
            totalPages,
            currentArticlesCount: currentArticles.length,
            startIndex,
            endIndex
        });
        
        setArticles(currentArticles);
    }, [filteredArticles, currentPage, articlesPerPage]);

    const handleRefresh = () => {
        loadNewsData();
    };

    const handleArticlesPerPageChange = (count) => {
        setArticlesPerPage(count);
        setCurrentPage(1); // Reset to first page
    };

    const scrollToArticlesTop = () => {
        if (articlesListRef.current) {
            articlesListRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    const handlePageChange = (page) => {
        const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Scroll to top of articles container when changing pages
            setTimeout(scrollToArticlesTop, 100);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            // Scroll to top of articles container when changing pages
            setTimeout(scrollToArticlesTop, 100);
        }
    };

    const handleNextPage = () => {
        const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        console.log('Next clicked - currentPage:', currentPage, 'totalPages:', totalPages);
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
            // Scroll to top of articles container when changing pages
            setTimeout(scrollToArticlesTop, 100);
        }
    };

    const handleArticleClick = (article) => {
        if (article.link) {
            window.open(article.link, '_blank', 'noopener,noreferrer');
        }
    };

    const renderLoading = () => (
        <div className="bookmark-media-loading">
            <div className="loading-spinner"></div>
            <p>Loading gun violence news for the past 6 months...</p>
        </div>
    );

    const renderError = () => (
        <div className="bookmark-media-error">
            <p>{error}</p>
            <button className="retry-btn" onClick={handleRefresh}>
                Try Again
            </button>
        </div>
    );

    const renderNoArticles = () => (
        <div className="bookmark-articles-container">
            <div className="bookmark-media-header">
                <h4>Gun Violence News</h4>
                <div className="bookmark-media-controls">
                    <div className="bookmark-article-count-selector">
                        <label htmlFor="articles-per-page-no">Show:</label>
                        <select
                            id="articles-per-page-no"
                            className="bookmark-count-select"
                            value={articlesPerPage}
                            onChange={(e) => handleArticlesPerPageChange(parseInt(e.target.value))}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <button 
                        className="refresh-btn"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>
            </div>
            
            <div className="bookmark-no-articles">
                <p>No gun violence news found</p>
                <p className="bookmark-no-articles-subtitle">
                    {selectedState 
                        ? `for ${selectedState} in the past 6 months`
                        : 'for the past 6 months'
                    }
                </p>
            </div>
        </div>
    );

    const renderArticles = () => {
        if (articles.length === 0) {
            return renderNoArticles();
        }

        return (
            <div className="bookmark-articles-container">
                <div className="bookmark-media-header">
                    <h4>Gun Violence News</h4>
                    <div className="bookmark-media-controls">
                        <div className="bookmark-article-count-selector">
                            <label htmlFor="articles-per-page">Show:</label>
                            <select
                                id="articles-per-page"
                                className="bookmark-count-select"
                                value={articlesPerPage}
                                onChange={(e) => handleArticlesPerPageChange(parseInt(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <button 
                            className="refresh-btn"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                
                <div className="bookmark-articles-list" ref={articlesListRef}>
                    {articles.map((article, index) => (
                        <div key={article.id || index} className="bookmark-article-card">
                            <div className="bookmark-article-header">
                                <h5 
                                    className="bookmark-article-title"
                                    onClick={() => handleArticleClick(article)}
                                >
                                    {article.title}
                                </h5>
                                <div className="bookmark-article-meta">
                                    <span className="bookmark-article-source">
                                        {article.source}
                                    </span>
                                    <span className="bookmark-article-date">
                                        {formatArticleDate(article.published)}
                                    </span>
                                </div>
                            </div>
                            
                            {article.summary && article.summary.length > 10 && (
                                <div className="bookmark-article-summary">
                                    {article.summary.length > 200 
                                        ? `${article.summary.substring(0, 200)}...`
                                        : article.summary
                                    }
                                </div>
                            )}
                            
                            <div className="bookmark-article-actions">
                                <button 
                                    className="bookmark-read-more-btn"
                                    onClick={() => handleArticleClick(article)}
                                >
                                    Read More →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderPagination = () => {
        const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        
        if (totalPages <= 1) {
            return null;
        }

        return (
            <div className="bookmark-pagination-controls">
                <div className="bookmark-pagination-info">
                    Showing {((currentPage - 1) * articlesPerPage) + 1} - {Math.min(currentPage * articlesPerPage, filteredArticles.length)} of {filteredArticles.length} articles
                </div>
                
                <div className="bookmark-pagination-buttons">
                    <button 
                        className="bookmark-pagination-btn"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                    >
                        ← Previous
                    </button>
                    
                    <div className="bookmark-page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else {
                                // Calculate which block of 5 pages we're in
                                const blockStart = Math.floor((currentPage - 1) / 5) * 5 + 1;
                                pageNum = blockStart + i;
                                
                                // If we're in the last block and it has fewer than 5 pages,
                                // adjust to show the last 5 pages
                                if (blockStart + 4 > totalPages) {
                                    pageNum = totalPages - 4 + i;
                                }
                            }
                            
                            return (
                                <button
                                    key={pageNum}
                                    className={`bookmark-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button 
                        className="bookmark-pagination-btn"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                    >
                        Next →
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bookmark-media-tab">
            {loading && renderLoading()}
            {error && !loading && renderError()}
            {!loading && !error && renderArticles()}
            {!loading && !error && renderPagination()}
            
            {lastUpdated && (
                <div style={{ 
                    marginTop: '1rem', 
                    fontSize: '0.8rem', 
                    color: '#666', 
                    textAlign: 'center' 
                }}>
                    Last updated: {formatArticleDate(lastUpdated.toISOString())}
                </div>
            )}
        </div>
    );
};

export default BookmarkMediaTab;

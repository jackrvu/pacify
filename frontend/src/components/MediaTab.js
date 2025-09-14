import React, { useState, useEffect, useRef } from 'react';
import {
    getSixMonthGunViolenceNews,
    getStateNews,
    getMediaCloudStatus,
    formatArticleDate,
    getSourceDomain
} from '../utils/mediaCloudService';
import {
    bookmarkNewsArticle,
    unbookmarkNewsArticle,
    isNewsArticleBookmarked
} from '../utils/newsBookmarkService';
import './MediaTab.css';

// Helper function to strip HTML tags
const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
};

const MediaTab = ({ selectedState, selectedPolicy, onBookmarkChange }) => {
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

    // Filter and sort articles - MediaTab always shows all articles
    const filterAndSortArticles = () => {
        let filtered = [...allArticles];

        // MediaTab always shows all articles, no state filtering
        // This ensures the main news tab always displays all 852 articles

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

    // Update articles when data loads
    useEffect(() => {
        if (allArticles.length > 0) {
            filterAndSortArticles();
        }
    }, [allArticles]);

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

    // Individual news article bookmark component
    const NewsBookmarkButton = ({ article }) => {
        const [bookmarkState, setBookmarkState] = useState(isNewsArticleBookmarked(article.id));

        // Update bookmark state when article changes
        useEffect(() => {
            setBookmarkState(isNewsArticleBookmarked(article.id));
        }, [article.id]);

        const handleBookmarkClick = (e) => {
            e.stopPropagation();
            if (bookmarkState) {
                const result = unbookmarkNewsArticle(article.id);
                if (result.success) {
                    setBookmarkState(false);
                    // Notify parent component to refresh bookmarks
                    if (onBookmarkChange) {
                        onBookmarkChange();
                    }
                } else {
                    alert(result.message);
                }
            } else {
                const result = bookmarkNewsArticle(article);
                if (result.success) {
                    setBookmarkState(true);
                    // Notify parent component to refresh bookmarks
                    if (onBookmarkChange) {
                        onBookmarkChange();
                    }
                } else {
                    alert(result.message);
                }
            }
        };

        return (
            <button
                className={`bookmark-btn ${bookmarkState ? 'bookmarked' : ''}`}
                onClick={handleBookmarkClick}
                title={bookmarkState ? 'Remove bookmark' : 'Bookmark article'}
            >
                {bookmarkState ? '★' : '☆'}
            </button>
        );
    };


    const renderLoading = () => (
        <div className="media-loading">
            <div className="loading-spinner"></div>
            <p>Loading gun violence news for the past 6 months...</p>
        </div>
    );

    const renderError = () => (
        <div className="media-error">
            <p>{error}</p>
            <button className="retry-btn" onClick={handleRefresh}>
                Try Again
            </button>
        </div>
    );

    const renderNoArticles = () => (
        <div className="articles-container">
            <div className="articles-header">
                <h4>Gun Violence News</h4>
                <div className="media-controls">
                    <div className="article-count-selector">
                        <label htmlFor="articles-per-page-no">Show:</label>
                        <select
                            id="articles-per-page-no"
                            className="count-select"
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

            <div className="no-articles">
                <p>No gun violence news found</p>
                <p className="no-articles-subtitle">
                    for the past 6 months
                </p>
            </div>
        </div>
    );

    const renderArticles = () => {
        if (articles.length === 0) {
            return renderNoArticles();
        }

        return (
            <div className="articles-container">
                <div className="articles-header">
                    <h4>Gun Violence News</h4>
                    <div className="media-controls">
                        <div className="article-count-selector">
                            <label htmlFor="articles-per-page">Show:</label>
                            <select
                                id="articles-per-page"
                                className="count-select"
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

                <div className="articles-list" ref={articlesListRef}>
                    {articles.map((article, index) => (
                        <div key={article.id || index} className="article-card">
                            <div className="article-header">
                                <h5
                                    className="article-title"
                                    onClick={() => handleArticleClick(article)}
                                >
                                    {article.title}
                                </h5>
                                <NewsBookmarkButton article={article} />
                            </div>
                            <div className="article-meta">
                                <span className="article-source">
                                    {article.source}
                                </span>
                                <span className="article-date">
                                    {formatArticleDate(article.published)}
                                </span>
                            </div>

                            <div className="article-actions">
                                <button
                                    className="read-more-btn"
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
            <div className="pagination-controls">
                <div className="pagination-info">
                    Showing {((currentPage - 1) * articlesPerPage) + 1} - {Math.min(currentPage * articlesPerPage, filteredArticles.length)} of {filteredArticles.length} articles
                </div>

                <div className="pagination-buttons">
                    <button
                        className="pagination-btn"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                    >
                        ← Previous
                    </button>

                    <div className="page-numbers">
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
                                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        className="pagination-btn"
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
        <div className="media-tab">
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

export default MediaTab;

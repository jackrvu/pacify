// AnalyticsDashboard component - Session-based analytics without login
// Provides data analysis tools with local storage persistence

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './AnalyticsDashboard.css';
import { getBookmarkedPolicies, unbookmarkPolicy, addAnnotation, updateAnnotation, removeAnnotation, bookmarkPolicy, isPolicyBookmarked } from '../utils/bookmarkService';
import { getBookmarkedNewsArticles, unbookmarkNewsArticle, addNewsAnnotation, updateNewsAnnotation, removeNewsAnnotation, isNewsArticleBookmarked } from '../utils/newsBookmarkService';
import { analyzePolicyWithGemini, getPolicyInsights, isGeminiAvailable } from '../utils/geminiService';
import VisualAnalysisResponse from './VisualAnalysisResponse';
import PolicyIncidentGraph from './PolicyIncidentGraph';
import PolicyModal from './PolicyModal';
import CustomDropdown from './CustomDropdown';
import MediaTab from './MediaTab';
import BookmarkMediaTab from './BookmarkMediaTab';

// Utility function for consistent timestamp generation
const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

// Utility function for user-friendly date formatting
const formatDateForDisplay = (dateString) => {
    try {
        if (!dateString) return 'No date';

        // Handle different date formats
        let date;
        if (typeof dateString === 'string') {
            // Check if it's already an ISO string
            if (dateString.includes('T') || dateString.includes('Z')) {
                date = new Date(dateString);
            } else {
                // Handle YYYY-M-D format from policy data
                const parts = dateString.split('-');
                if (parts.length >= 3) {
                    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    date = new Date(dateString);
                }
            }
        } else {
            date = new Date(dateString);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return original string if invalid
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Date formatting error:', error, 'for date:', dateString);
        return dateString; // Return original string if parsing fails
    }
};

// Function to determine policy effect based on law class
const determinePolicyEffect = (lawClass) => {
    if (!lawClass) return null;

    const lawClassLower = lawClass.toLowerCase();

    // Permissive policies
    const permissiveKeywords = ['concealed carry', 'constitutional carry', 'shall issue',
        'preemption', 'castle doctrine', 'stand your ground', 'open carry'];
    if (permissiveKeywords.some(keyword => lawClassLower.includes(keyword))) {
        return 'permissive';
    }

    // Restrictive policies
    const restrictiveKeywords = ['background check', 'waiting', 'prohibited', 'minimum age',
        'registration', 'license required', 'permit required', 'ban',
        'child access', 'safe storage', 'reporting', 'training required'];
    if (restrictiveKeywords.some(keyword => lawClassLower.includes(keyword))) {
        return 'restrictive';
    }

    return null;
};

const AnalyticsDashboard = ({
    incidents,
    timelineData,
    availableYears,
    getDataForYear,
    getYearStats,
    onClose,
    selectedPolicyForDashboard,
    showAnalyticsDashboard,
    onFlyToLocation
}) => {
    // Navigation hook
    const navigate = useNavigate();

    // Dashboard view state
    const [activeView, setActiveView] = useState('analytics'); // 'analytics', 'bookmarks', 'news', 'policy-details', 'news-details'

    // Bookmark state
    const [bookmarkedPolicies, setBookmarkedPolicies] = useState([]);
    const [bookmarkedNewsArticles, setBookmarkedNewsArticles] = useState([]);
    const [selectedBookmark, setSelectedBookmark] = useState(null);
    const [showBookmarkModal, setShowBookmarkModal] = useState(false);
    const [bookmarkSearch, setBookmarkSearch] = useState('');
    const [bookmarkTypeFilter, setBookmarkTypeFilter] = useState('all'); // 'all', 'policy', 'news'

    // Policy details state
    const [currentPolicy, setCurrentPolicy] = useState(null);
    const [policyAnnotations, setPolicyAnnotations] = useState([]);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [annotationType, setAnnotationType] = useState('note');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiResponse, setGeminiResponse] = useState('');
    const [showGeminiPanel, setShowGeminiPanel] = useState(true);
    const [geminiQuestion, setGeminiQuestion] = useState('');
    const [currentAnalysisType, setCurrentAnalysisType] = useState(null);
    const [activeAnalysisTab, setActiveAnalysisTab] = useState('ai'); // 'ai', 'annotations', 'media'

    // News details state
    const [currentNewsArticle, setCurrentNewsArticle] = useState(null);
    const [newsAnnotations, setNewsAnnotations] = useState([]);
    const [newNewsAnnotation, setNewNewsAnnotation] = useState('');
    const [newsAnnotationType, setNewsAnnotationType] = useState('note');
    const [activeNewsAnalysisTab, setActiveNewsAnalysisTab] = useState('annotations'); // 'annotations', 'media'

    // Annotation editing state
    const [editingAnnotation, setEditingAnnotation] = useState(null);
    const [editAnnotationContent, setEditAnnotationContent] = useState('');

    // Simple session info for display
    const [sessionCreated] = useState(getCurrentTimestamp());

    // Policy data state
    const [policies, setPolicies] = useState([]);
    const [policiesLoading, setPoliciesLoading] = useState(true);
    const [policyFilter, setPolicyFilter] = useState({
        state: 'all',
        year: 'all'
    });
    const [sortBy, setSortBy] = useState('state'); // 'date', 'policy', 'state'

    // Policy modal state
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [selectedPolicyForModal, setSelectedPolicyForModal] = useState(null);

    // Delete confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [annotationToDelete, setAnnotationToDelete] = useState(null);

    // Bookmark removal confirmation modal state
    const [showBookmarkDeleteModal, setShowBookmarkDeleteModal] = useState(false);
    const [bookmarkToDelete, setBookmarkToDelete] = useState(null);

    // Load policy data
    useEffect(() => {
        const loadPolicyData = async () => {
            try {
                setPoliciesLoading(true);
                const response = await fetch('/policy_analysis_results.json');

                if (!response.ok) {
                    throw new Error(`Failed to fetch policy data: ${response.status}`);
                }

                const responseText = await response.text();
                const cleanedJson = responseText.replace(/:\s*NaN\s*,/g, ': null,').replace(/:\s*NaN\s*}/g, ': null}');
                const policyData = JSON.parse(cleanedJson);

                // Filter and sort policies chronologically
                const validPolicies = policyData.filter(policy =>
                    policy &&
                    typeof policy === 'object' &&
                    policy.effective_date &&
                    policy.state &&
                    policy.law_id
                ).sort((a, b) => {
                    const dateA = new Date(a.effective_date);
                    const dateB = new Date(b.effective_date);
                    return dateB - dateA; // Most recent first
                });

                setPolicies(validPolicies);
                console.log(`Loaded ${validPolicies.length} policies chronologically`);
            } catch (error) {
                console.error('Error loading policy data:', error);
                setPolicies([]);
            } finally {
                setPoliciesLoading(false);
            }
        };

        loadPolicyData();
    }, []);

    // Load bookmarked policies and news articles
    useEffect(() => {
        const policyBookmarks = getBookmarkedPolicies();
        const newsBookmarks = getBookmarkedNewsArticles();
        setBookmarkedPolicies(policyBookmarks);
        setBookmarkedNewsArticles(newsBookmarks);
    }, []);

    // Function to refresh bookmarked news articles (called from MediaTab)
    const refreshBookmarkedNewsArticles = () => {
        const newsBookmarks = getBookmarkedNewsArticles();
        setBookmarkedNewsArticles(newsBookmarks);
    };

    // Create combined bookmark list with filtering
    const combinedBookmarks = useMemo(() => {
        const policyBookmarks = bookmarkedPolicies.map(bookmark => ({
            ...bookmark,
            type: 'policy',
            displayTitle: bookmark.law_class ? bookmark.law_class.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : 'Unknown Law Class',
            displayDate: bookmark.effective_date,
            displayMeta: bookmark.state
        }));

        const newsBookmarks = bookmarkedNewsArticles.map(bookmark => ({
            ...bookmark,
            type: 'news',
            displayTitle: bookmark.title,
            displayDate: bookmark.published,
            displayMeta: bookmark.source
        }));

        const combined = [...policyBookmarks, ...newsBookmarks];

        // Apply type filter
        let filtered = combined;
        if (bookmarkTypeFilter !== 'all') {
            filtered = combined.filter(bookmark => bookmark.type === bookmarkTypeFilter);
        }

        // Apply search filter
        if (bookmarkSearch.trim()) {
            const searchLower = bookmarkSearch.toLowerCase();
            filtered = filtered.filter(bookmark =>
                bookmark.displayTitle.toLowerCase().includes(searchLower) ||
                bookmark.displayMeta.toLowerCase().includes(searchLower) ||
                (bookmark.summary && bookmark.summary.toLowerCase().includes(searchLower)) ||
                (bookmark.human_explanation && bookmark.human_explanation.toLowerCase().includes(searchLower))
            );
        }

        // Sort by bookmark date (most recent first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.bookmarked_at);
            const dateB = new Date(b.bookmarked_at);
            return dateB - dateA;
        });

        return filtered;
    }, [bookmarkedPolicies, bookmarkedNewsArticles, bookmarkTypeFilter, bookmarkSearch]);

    // Handle policy selection for dashboard viewing
    useEffect(() => {
        if (selectedPolicyForDashboard && showAnalyticsDashboard) {
            setCurrentPolicy(selectedPolicyForDashboard);
            setActiveView('policy-details');

            // Load existing annotations for this policy
            const bookmarks = getBookmarkedPolicies();
            const bookmark = bookmarks.find(b => b.law_id === selectedPolicyForDashboard.law_id);
            if (bookmark && bookmark.annotations) {
                setPolicyAnnotations(bookmark.annotations);
            } else {
                setPolicyAnnotations([]);
            }
        }
    }, [selectedPolicyForDashboard, showAnalyticsDashboard]);





    // Bookmark handlers
    const handleRemoveBookmark = (lawId) => {
        const bookmark = bookmarkedPolicies.find(b => b.law_id === lawId);
        setBookmarkToDelete(bookmark);
        setShowBookmarkDeleteModal(true);
    };

    const confirmRemoveBookmark = () => {
        if (bookmarkToDelete) {
            // Check if it's a policy bookmark or news bookmark
            if (bookmarkToDelete.law_id) {
                // Policy bookmark
                const result = unbookmarkPolicy(bookmarkToDelete.law_id);
                if (result.success) {
                    setBookmarkedPolicies(prev => prev.filter(b => b.law_id !== bookmarkToDelete.law_id));
                } else {
                    alert(result.message);
                }
            } else {
                // News bookmark
                const result = unbookmarkNewsArticle(bookmarkToDelete.id);
                if (result.success) {
                    const newsBookmarks = getBookmarkedNewsArticles();
                    setBookmarkedNewsArticles(newsBookmarks);
                } else {
                    alert(result.message);
                }
            }
        }
        setShowBookmarkDeleteModal(false);
        setBookmarkToDelete(null);
    };

    const cancelRemoveBookmark = () => {
        setShowBookmarkDeleteModal(false);
        setBookmarkToDelete(null);
    };

    const handleViewBookmark = (bookmark) => {
        console.log('handleViewBookmark called with bookmark:', bookmark);

        if (bookmark.type === 'news') {
            // For news bookmarks, set as current news article and show details view
            setCurrentNewsArticle(bookmark);
            setActiveView('news-details');

            // Load existing annotations for this news article
            if (bookmark.annotations) {
                setNewsAnnotations(bookmark.annotations);
            } else {
                setNewsAnnotations([]);
            }

            console.log('Switched to news-details view with article:', bookmark);
        } else {
            // For policy bookmarks, convert to policy format and set as current policy
            const policyData = {
                law_id: bookmark.law_id,
                state: bookmark.state,
                law_class: bookmark.law_class,
                effect: bookmark.effect,
                effective_date: bookmark.effective_date,
                original_content: bookmark.original_content,
                human_explanation: bookmark.human_explanation,
                mass_shooting_analysis: bookmark.mass_shooting_analysis,
                state_mass_shooting_stats: bookmark.state_mass_shooting_stats
            };

            setCurrentPolicy(policyData);
            setActiveView('policy-details');

            // Load existing annotations for this policy
            if (bookmark.annotations) {
                setPolicyAnnotations(bookmark.annotations);
            } else {
                setPolicyAnnotations([]);
            }

            console.log('Switched to policy-details view with policy:', policyData);
        }
    };

    const handleUnbookmarkNews = (articleId) => {
        const newsBookmarks = getBookmarkedNewsArticles();
        const bookmark = newsBookmarks.find(b => b.id === articleId);
        if (bookmark) {
            setBookmarkToDelete(bookmark);
            setShowBookmarkDeleteModal(true);
        }
    };



    // Filtered bookmarks
    const filteredBookmarks = useMemo(() => {
        return bookmarkedPolicies.filter(bookmark => {
            const matchesSearch = !bookmarkSearch ||
                bookmark.state?.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
                bookmark.law_class?.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
                bookmark.original_content?.toLowerCase().includes(bookmarkSearch.toLowerCase());

            return matchesSearch;
        });
    }, [bookmarkedPolicies, bookmarkSearch]);

    // Filter and sort policies based on current filter settings
    const filteredPolicies = useMemo(() => {
        const filtered = policies.filter(policy => {
            const policyYear = new Date(policy.effective_date).getFullYear();

            return (
                (policyFilter.state === 'all' || policy.state === policyFilter.state) &&
                (policyFilter.year === 'all' || policyYear.toString() === policyFilter.year)
            );
        });

        // Sort the filtered policies
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.effective_date) - new Date(a.effective_date); // Most recent first
                case 'policy':
                    const policyA = a.law_class || a.policy_type || '';
                    const policyB = b.law_class || b.policy_type || '';
                    return policyA.localeCompare(policyB);
                case 'state':
                default:
                    return a.state.localeCompare(b.state);
            }
        });
    }, [policies, policyFilter, sortBy]);

    // Get unique values for filter dropdowns
    const uniqueStates = useMemo(() => {
        const states = [...new Set(policies.map(p => p.state))].sort();
        return states;
    }, [policies]);

    const uniqueYears = useMemo(() => {
        const years = [...new Set(policies.map(p => new Date(p.effective_date).getFullYear()))].sort((a, b) => b - a);
        return years;
    }, [policies]);

    // Policy browser handlers
    const handleViewPolicyDetails = (policy) => {
        setCurrentPolicy(policy);
        setActiveView('policy-details');
    };

    const handleBookmarkPolicy = (policy) => {
        if (isPolicyBookmarked(policy.law_id)) {
            // Unbookmark
            const result = unbookmarkPolicy(policy.law_id);
            if (result.success) {
                // Refresh bookmarked policies
                const bookmarks = getBookmarkedPolicies();
                setBookmarkedPolicies(bookmarks);
            } else {
                alert(result.message);
            }
        } else {
            // Bookmark
            const policyData = {
                law_id: policy.law_id,
                state: policy.state,
                policy_type: policy.policy_type,
                law_class: policy.law_class,
                effect: policy.effect,
                effective_date: policy.effective_date,
                description: policy.description,
                impact_analysis: policy.impact_analysis,
                original_content: policy.original_content,
                human_explanation: policy.human_explanation,
                mass_shooting_analysis: policy.mass_shooting_analysis,
                state_mass_shooting_stats: policy.state_mass_shooting_stats
            };
            const result = bookmarkPolicy(policyData);
            if (result.success) {
                // Refresh bookmarked policies
                const bookmarks = getBookmarkedPolicies();
                setBookmarkedPolicies(bookmarks);
            } else {
                alert(result.message);
            }
        }
    };

    // Check if a policy is bookmarked
    const isPolicyBookmarked = (lawId) => {
        return bookmarkedPolicies.some(bookmark => bookmark.law_id === lawId);
    };

    // Handle opening policy modal
    const handleOpenPolicyModal = (policy) => {
        setSelectedPolicyForModal(policy);
        setShowPolicyModal(true);
    };

    // Handle closing policy modal
    const handleClosePolicyModal = () => {
        setShowPolicyModal(false);
        setSelectedPolicyForModal(null);
    };

    // Policy details handlers
    const handleAddAnnotation = () => {
        if (!newAnnotation.trim() || !currentPolicy) return;

        const result = addAnnotation(currentPolicy.law_id, {
            content: newAnnotation,
            type: annotationType,
            gemini_response: geminiResponse || null
        });

        if (result.success) {
            setNewAnnotation('');
            setGeminiResponse('');

            // Reload annotations
            const bookmarks = getBookmarkedPolicies();
            const bookmark = bookmarks.find(b => b.law_id === currentPolicy.law_id);
            if (bookmark && bookmark.annotations) {
                setPolicyAnnotations(bookmark.annotations);
            }

            // Move camera to annotation location instead of showing alert
            if (onFlyToLocation && currentPolicy.state) {
                onFlyToLocation(currentPolicy.state);
            }
        } else {
            alert(result.message);
        }
    };

    // Edit annotation handler
    const handleEditAnnotation = (annotation) => {
        setEditingAnnotation(annotation);
        setEditAnnotationContent(annotation.content);
    };

    // Save edited annotation
    const handleSaveEditAnnotation = () => {
        if (!editAnnotationContent.trim() || !editingAnnotation || !currentPolicy) return;

        const result = updateAnnotation(currentPolicy.law_id, editingAnnotation.id, editAnnotationContent);

        if (result.success) {
            // Reload annotations
            const bookmarks = getBookmarkedPolicies();
            const bookmark = bookmarks.find(b => b.law_id === currentPolicy.law_id);
            if (bookmark && bookmark.annotations) {
                setPolicyAnnotations(bookmark.annotations);
            }

            // Clear editing state
            setEditingAnnotation(null);
            setEditAnnotationContent('');
        } else {
            alert(result.message);
        }
    };

    // Cancel edit annotation
    const handleCancelEditAnnotation = () => {
        setEditingAnnotation(null);
        setEditAnnotationContent('');
    };

    // Show delete confirmation modal
    const handleDeleteAnnotation = (annotationId) => {
        setAnnotationToDelete(annotationId);
        setShowDeleteModal(true);
    };

    // Confirm delete annotation
    const confirmDeleteAnnotation = () => {
        if (!annotationToDelete) return;

        let result;
        if (currentPolicy) {
            // Delete policy annotation
            result = removeAnnotation(currentPolicy.law_id, annotationToDelete);
            if (result.success) {
                // Reload annotations
                const bookmarks = getBookmarkedPolicies();
                const bookmark = bookmarks.find(b => b.law_id === currentPolicy.law_id);
                if (bookmark && bookmark.annotations) {
                    setPolicyAnnotations(bookmark.annotations);
                }
            }
        } else if (currentNewsArticle) {
            // Delete news annotation
            result = removeNewsAnnotation(currentNewsArticle.id, annotationToDelete);
            if (result.success) {
                // Reload annotations
                const bookmarks = getBookmarkedNewsArticles();
                const bookmark = bookmarks.find(b => b.id === currentNewsArticle.id);
                if (bookmark && bookmark.annotations) {
                    setNewsAnnotations(bookmark.annotations);
                }
            }
        } else {
            return;
        }

        if (!result.success) {
            alert(result.message);
        }

        // Close modal and reset state
        setShowDeleteModal(false);
        setAnnotationToDelete(null);
    };

    // Cancel delete annotation
    const cancelDeleteAnnotation = () => {
        setShowDeleteModal(false);
        setAnnotationToDelete(null);
    };

    // Get analysis title based on insight type
    const getAnalysisTitle = (insightType) => {
        const titles = {
            'safety_impact': 'Safety Impact Analysis',
            'constitutional': 'Constitutional Analysis',
            'effectiveness': 'Policy Effectiveness Analysis',
            'comparison': 'State Comparison Analysis',
            'unintended': 'Unintended Consequences Analysis',
            'implementation': 'Implementation Challenges Analysis'
        };
        return titles[insightType] || 'AI Analysis';
    };

    const handleGeminiAnalysis = async (insightType = null) => {
        if (!isGeminiAvailable()) {
            alert('Gemini API is not configured. Please set up your API key to use AI analysis.');
            return;
        }

        if (!currentPolicy) return;

        setGeminiLoading(true);
        setGeminiResponse('');
        setCurrentAnalysisType(insightType);

        try {
            console.log('Analyzing policy with insight type:', insightType);

            const result = insightType
                ? await getPolicyInsights(currentPolicy, insightType)
                : await analyzePolicyWithGemini(currentPolicy, geminiQuestion || null);

            console.log('Analysis result for', insightType, ':', result);

            if (result.success) {
                setGeminiResponse(result.analysis);
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Failed to analyze policy: ' + error.message);
        } finally {
            setGeminiLoading(false);
        }
    };

    const handleBackToAnalytics = () => {
        setActiveView('analytics');
        setCurrentPolicy(null);
        setPolicyAnnotations([]);
        setNewAnnotation('');
        setGeminiResponse('');
        setShowGeminiPanel(false);
    };

    // News annotation handlers
    const handleAddNewsAnnotation = () => {
        if (!newNewsAnnotation.trim() || !currentNewsArticle) return;

        const result = addNewsAnnotation(currentNewsArticle.id, {
            content: newNewsAnnotation,
            type: newsAnnotationType
        });

        if (result.success) {
            setNewNewsAnnotation('');

            // Reload annotations
            const bookmarks = getBookmarkedNewsArticles();
            const bookmark = bookmarks.find(b => b.id === currentNewsArticle.id);
            if (bookmark && bookmark.annotations) {
                setNewsAnnotations(bookmark.annotations);
            }
        } else {
            alert(result.message);
        }
    };

    const handleEditNewsAnnotation = (annotation) => {
        setEditingAnnotation(annotation);
        setEditAnnotationContent(annotation.content);
    };

    const handleSaveEditNewsAnnotation = () => {
        if (!editAnnotationContent.trim() || !editingAnnotation || !currentNewsArticle) return;

        const result = updateNewsAnnotation(currentNewsArticle.id, editingAnnotation.id, editAnnotationContent);

        if (result.success) {
            // Reload annotations
            const bookmarks = getBookmarkedNewsArticles();
            const bookmark = bookmarks.find(b => b.id === currentNewsArticle.id);
            if (bookmark && bookmark.annotations) {
                setNewsAnnotations(bookmark.annotations);
            }

            // Clear editing state
            setEditingAnnotation(null);
            setEditAnnotationContent('');
        } else {
            alert(result.message);
        }
    };

    const handleCancelEditNewsAnnotation = () => {
        setEditingAnnotation(null);
        setEditAnnotationContent('');
    };

    const handleDeleteNewsAnnotation = (annotationId) => {
        setAnnotationToDelete(annotationId);
        setShowDeleteModal(true);
    };

    const confirmDeleteNewsAnnotation = () => {
        if (!currentNewsArticle || !annotationToDelete) return;

        const result = removeNewsAnnotation(currentNewsArticle.id, annotationToDelete);

        if (result.success) {
            // Reload annotations
            const bookmarks = getBookmarkedNewsArticles();
            const bookmark = bookmarks.find(b => b.id === currentNewsArticle.id);
            if (bookmark && bookmark.annotations) {
                setNewsAnnotations(bookmark.annotations);
            }
        } else {
            alert(result.message);
        }

        // Close modal and reset state
        setShowDeleteModal(false);
        setAnnotationToDelete(null);
    };

    const handleBackToBookmarks = () => {
        setActiveView('bookmarks');
        setCurrentNewsArticle(null);
        setNewsAnnotations([]);
        setNewNewsAnnotation('');
    };

    // Extract state from article title or content if state field is empty
    const extractStateFromArticle = (article) => {
        if (!article) return null;

        // List of US states for matching
        const states = [
            'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
            'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
            'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
            'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
            'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
            'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
            'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
        ];

        const textToSearch = `${article.title || ''} ${article.content || ''} ${article.summary || ''}`.toLowerCase();

        // Find the first state mentioned in the article
        for (const state of states) {
            if (textToSearch.includes(state.toLowerCase())) {
                return state;
            }
        }

        return null;
    };

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="session-info">
                    <button
                        className="nav-btn methodology-btn"
                        onClick={() => navigate('/methodology')}
                    >
                        Methodology
                    </button>
                    <button
                        className="nav-btn about-btn"
                        onClick={() => navigate('/about')}
                    >
                        About
                    </button>
                </div>

                <div className="session-controls">
                    <div className="view-switcher">
                        <button
                            className={`view-btn analytics-btn ${activeView === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveView('analytics')}
                        >
                            Analytics
                        </button>
                        <button
                            className={`view-btn news-btn ${activeView === 'news' ? 'active' : ''}`}
                            onClick={() => setActiveView('news')}
                        >
                            News
                        </button>
                        <button
                            className={`view-btn bookmarks-btn ${activeView === 'bookmarks' ? 'active' : ''}`}
                            onClick={() => setActiveView('bookmarks')}
                        >
                            Bookmarks
                        </button>
                    </div>



                    <button onClick={onClose} className="btn btn-close">
                        ✕
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div className="dashboard-content">
                {activeView === 'analytics' && (
                    <div className="dashboard-main">
                        <div className="workspace-header">
                            <h2>Policy Timeline Browser</h2>
                        </div>

                        {/* Policy Filters */}
                        <div className="policy-filters">
                            <div className="filter-group">
                                <label>State:</label>
                                <CustomDropdown
                                    value={policyFilter.state}
                                    onChange={(value) => setPolicyFilter(prev => ({ ...prev, state: value }))}
                                    options={[
                                        { value: "all", label: "All States" },
                                        ...uniqueStates.map(state => ({ value: state, label: state }))
                                    ]}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Sort By:</label>
                                <CustomDropdown
                                    value={sortBy}
                                    onChange={setSortBy}
                                    options={[
                                        { value: "state", label: "State Name" },
                                        { value: "policy", label: "Policy Name" },
                                        { value: "date", label: "Date" }
                                    ]}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Year:</label>
                                <CustomDropdown
                                    value={policyFilter.year}
                                    onChange={(value) => setPolicyFilter(prev => ({ ...prev, year: value }))}
                                    options={[
                                        { value: "all", label: "All Years" },
                                        ...uniqueYears.map(year => ({ value: year.toString(), label: year.toString() }))
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Policy List */}
                        <div className="policy-list">
                            {policiesLoading ? (
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading policies...</p>
                                </div>
                            ) : filteredPolicies.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📋</div>
                                    <h3>No policies found</h3>
                                    <p>Try adjusting your filters to see more policies</p>
                                </div>
                            ) : (
                                <div className="policy-grid">
                                    {filteredPolicies.map((policy, index) => (
                                        <div key={policy.law_id || index} className="policy-card" onClick={() => handleOpenPolicyModal(policy)}>
                                            <div className="policy-header">
                                                <h3>{policy.state} {policy.policy_type}</h3>
                                                <span className="policy-date">
                                                    {formatDateForDisplay(policy.effective_date)}
                                                </span>
                                            </div>

                                            <div className="policy-details">
                                                <div className="policy-info">
                                                    <strong>Description:</strong> {policy.law_class ?
                                                        policy.law_class.split(' ').map(word =>
                                                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                                        ).join(' ') :
                                                        'No description available'
                                                    }
                                                </div>
                                                {policy.impact_analysis && (
                                                    <div className="policy-impact">
                                                        <strong>Impact:</strong> {policy.impact_analysis}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Incident Graph */}
                                            <div className="policy-graph">
                                                <PolicyIncidentGraph
                                                    state={policy.state}
                                                    policyDate={policy.effective_date}
                                                    timelineData={timelineData}
                                                />
                                            </div>

                                            <div className="policy-actions">
                                                <button
                                                    className={`bookmark-btn ${isPolicyBookmarked(policy.law_id) ? 'bookmarked' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBookmarkPolicy(policy);
                                                    }}
                                                    title={isPolicyBookmarked(policy.law_id) ? 'Remove bookmark' : 'Bookmark policy'}
                                                >
                                                    {isPolicyBookmarked(policy.law_id) ? '★' : '☆'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'bookmarks' && (
                    <div className="bookmarks-view">
                        <div className="bookmarks-header">
                            <h2>Bookmarks</h2>
                            <p>Manage your saved policies and news articles</p>
                        </div>

                        {/* Bookmarks Controls */}
                        <div className="bookmarks-controls">
                            <div className="bookmarks-filters">
                                <CustomDropdown
                                    value={bookmarkTypeFilter}
                                    onChange={setBookmarkTypeFilter}
                                    options={[
                                        { value: "all", label: "All Bookmarks" },
                                        { value: "policy", label: "Policies Only" },
                                        { value: "news", label: "News Only" }
                                    ]}
                                    className="type-filter-dropdown"
                                />
                                <input
                                    type="text"
                                    value={bookmarkSearch}
                                    onChange={(e) => setBookmarkSearch(e.target.value)}
                                    placeholder="Search bookmarks..."
                                    className="search-input"
                                />
                            </div>
                        </div>

                        {/* Bookmarks List */}
                        <div className="bookmarks-list">
                            {combinedBookmarks.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon"></div>
                                    <h3>No bookmarks</h3>
                                    <p>Bookmark policies from the map or news articles to see them here</p>
                                </div>
                            ) : (
                                combinedBookmarks.map((bookmark) => (
                                    <div key={bookmark.id} className="bookmark-card" onClick={() => handleViewBookmark(bookmark)}>
                                        <div className="bookmark-header">
                                            <div className="bookmark-title">
                                                <div className="bookmark-title-row">
                                                    <h3>{bookmark.displayTitle}</h3>
                                                    <span className={`bookmark-type-tag ${bookmark.type}`}>
                                                        {bookmark.type === 'policy' ? 'Policy' : 'News'}
                                                    </span>
                                                </div>
                                                <div className="bookmark-meta">
                                                    <span className="bookmark-meta-item">{bookmark.displayMeta}</span>
                                                    {bookmark.type === 'policy' && (() => {
                                                        const effect = bookmark.effect || determinePolicyEffect(bookmark.law_class);
                                                        return effect && (
                                                            <span
                                                                className={`bookmark-effect ${effect.toLowerCase()}`}
                                                            >
                                                                {effect.toUpperCase()}
                                                            </span>
                                                        );
                                                    })()}
                                                    <span className="bookmark-date">
                                                        {formatDateForDisplay(bookmark.displayDate)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bookmark-actions">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (bookmark.type === 'news') {
                                                            handleUnbookmarkNews(bookmark.id);
                                                        } else {
                                                            handleRemoveBookmark(bookmark.law_id);
                                                        }
                                                    }}
                                                    className="close-bookmark-btn"
                                                    title="Remove bookmark"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bookmark-content">
                                            <p className="bookmark-summary">
                                                {bookmark.type === 'news'
                                                    ? (bookmark.summary?.substring(0, 200) || bookmark.content?.substring(0, 200) || 'No summary available')
                                                    : (bookmark.original_content?.substring(0, 200) || 'No content available')
                                                }{bookmark.type === 'news' ? '' : '...'}
                                            </p>

                                            {bookmark.annotations && bookmark.annotations.length > 0 && (
                                                <div className="bookmark-annotations">
                                                    <h4>Annotations ({bookmark.annotations.length})</h4>
                                                    <div className="annotations-list">
                                                        {bookmark.annotations.slice(0, 2).map((annotation) => (
                                                            <div key={annotation.id} className="annotation-item">
                                                                <span className="annotation-type">
                                                                    {annotation.type === 'note' ? 'Note' :
                                                                        annotation.type === 'question' ? 'Question' : 'Insight'}
                                                                </span>
                                                                <span className="annotation-content">
                                                                    {annotation.content}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {bookmark.annotations.length > 2 && (
                                                            <div className="annotation-more">
                                                                +{bookmark.annotations.length - 2} more annotations
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'news' && (
                    <div className="news-view">
                        <div className="news-content">
                            <MediaTab
                                selectedState={currentPolicy?.state}
                                selectedPolicy={currentPolicy}
                                onBookmarkChange={refreshBookmarkedNewsArticles}
                            />
                        </div>
                    </div>
                )}


                {activeView === 'news-details' && currentNewsArticle && (
                    <div className="news-details-view">
                        <div className="news-details-header">
                            <button
                                onClick={handleBackToBookmarks}
                                className="back-btn"
                            >
                                ← Back to Bookmarks
                            </button>
                            <h2>News Article Analysis</h2>
                        </div>

                        <div className="news-details-content">
                            {/* News Article Information */}
                            <div className="news-info-section">
                                <div className="news-header">
                                    <h3>{currentNewsArticle.title}</h3>
                                    <div className="news-meta">
                                        <span className="news-date">
                                            {formatDateForDisplay(currentNewsArticle.published)}
                                        </span>
                                        <span className="news-source">{currentNewsArticle.source}</span>
                                        <button
                                            className="external-link-btn"
                                            onClick={() => window.open(currentNewsArticle.link, '_blank', 'noopener,noreferrer')}
                                        >
                                            Read Original Article →
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* Analysis Tools */}
                            <div className="analysis-tools-section">
                                <div className="tools-header">
                                    <h3>Analysis Tools</h3>
                                    <div className="tools-tabs">
                                        <button
                                            className={`tool-tab ${activeNewsAnalysisTab === 'annotations' ? 'active' : ''}`}
                                            onClick={() => setActiveNewsAnalysisTab('annotations')}
                                        >
                                            Annotations
                                        </button>
                                        <button
                                            className={`tool-tab ${activeNewsAnalysisTab === 'media' ? 'active' : ''}`}
                                            onClick={() => setActiveNewsAnalysisTab('media')}
                                        >
                                            Related News
                                        </button>
                                    </div>
                                </div>

                                {/* Annotations Panel */}
                                {activeNewsAnalysisTab === 'annotations' && (
                                    <div className="annotations-panel">
                                        <div className="annotation-input">
                                            <CustomDropdown
                                                value={newsAnnotationType}
                                                onChange={setNewsAnnotationType}
                                                options={[
                                                    { value: "note", label: "Note" },
                                                    { value: "question", label: "Question" },
                                                    { value: "insight", label: "Insight" }
                                                ]}
                                                className="annotation-type-select"
                                            />
                                            <textarea
                                                value={newNewsAnnotation}
                                                onChange={(e) => setNewNewsAnnotation(e.target.value)}
                                                placeholder="Add your annotation about this news article..."
                                                className="annotation-textarea"
                                                rows="3"
                                            />
                                            <button
                                                onClick={handleAddNewsAnnotation}
                                                className="add-annotation-btn"
                                                disabled={!newNewsAnnotation.trim()}
                                            >
                                                Add Annotation
                                            </button>
                                        </div>

                                        {/* Existing Annotations */}
                                        {newsAnnotations.length > 0 && (
                                            <div className="existing-annotations">
                                                <h4>Your Annotations ({newsAnnotations.length})</h4>
                                                <div className="annotations-list">
                                                    {newsAnnotations.map((annotation, index) => (
                                                        <div key={annotation.id || index} className="annotation-item">
                                                            {editingAnnotation && editingAnnotation.id === annotation.id ? (
                                                                // Edit mode
                                                                <div className="annotation-edit-mode">
                                                                    <textarea
                                                                        value={editAnnotationContent}
                                                                        onChange={(e) => setEditAnnotationContent(e.target.value)}
                                                                        className="annotation-edit-textarea"
                                                                        rows="3"
                                                                    />
                                                                    <div className="annotation-edit-actions">
                                                                        <button
                                                                            onClick={handleSaveEditNewsAnnotation}
                                                                            className="save-annotation-btn"
                                                                            disabled={!editAnnotationContent.trim()}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelEditNewsAnnotation}
                                                                            className="cancel-annotation-btn"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // View mode
                                                                <>
                                                                    <div className="annotation-header">
                                                                        <div className="annotation-left">
                                                                            <span className="annotation-type">
                                                                                {annotation.type === 'note' ? 'Note' :
                                                                                    annotation.type === 'question' ? 'Question' : 'Insight'}
                                                                            </span>
                                                                            <span className="annotation-date">
                                                                                {formatDateForDisplay(annotation.created_at || annotation.timestamp)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="annotation-actions">
                                                                            <button
                                                                                onClick={() => handleEditNewsAnnotation(annotation)}
                                                                                className="edit-annotation-btn"
                                                                                title="Edit annotation"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteNewsAnnotation(annotation.id)}
                                                                                className="delete-annotation-btn"
                                                                                title="Delete annotation"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="annotation-content">
                                                                        {annotation.content}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Related News Panel */}
                                {activeNewsAnalysisTab === 'media' && (
                                    <div className="media-panel">
                                        <BookmarkMediaTab
                                            selectedState={currentNewsArticle?.state || extractStateFromArticle(currentNewsArticle)}
                                            selectedPolicy={null}
                                            onBookmarkChange={refreshBookmarkedNewsArticles}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'policy-details' && currentPolicy && (
                    <div className="policy-details-view">
                        <div className="policy-details-header">
                            <button
                                onClick={() => setActiveView('bookmarks')}
                                className="back-btn"
                            >
                                ← Back to Bookmarks
                            </button>
                            <h2>Policy Analysis Dashboard</h2>
                        </div>

                        <div className="policy-details-content">
                            {/* Policy Information */}
                            <div className="policy-info-section">
                                <div className="policy-header">
                                    <h3>{currentPolicy.law_class}</h3>
                                    <div className="policy-meta">
                                        <span className="policy-date">
                                            {formatDateForDisplay(currentPolicy.effective_date)}
                                        </span>
                                        <span className="policy-state">{currentPolicy.state}</span>
                                        <span
                                            className={`policy-effect ${currentPolicy.effect?.toLowerCase()}`}
                                        >
                                            {currentPolicy.effect}
                                        </span>
                                    </div>
                                </div>

                                {/* Policy Content and AI Analysis Side by Side */}
                                <div className="policy-content-analysis-container">
                                    {/* Policy Content */}
                                    <div className="policy-content-section">
                                        <h4>Policy Content</h4>
                                        <div className="policy-content-text">
                                            {currentPolicy.original_content || 'No content available'}
                                        </div>
                                    </div>

                                    {/* Gemini Analysis */}
                                    {currentPolicy.human_explanation && (
                                        <div className="gemini-analysis-section">
                                            <h4>Analysis with Gemini 2.5 Pro</h4>
                                            <div className="gemini-analysis-content">
                                                {currentPolicy.human_explanation.split('\n').map((paragraph, idx) => (
                                                    <p key={idx}>{paragraph}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Analysis Tools */}
                            <div className="analysis-tools-section">
                                <div className="tools-header">
                                    <h3>Analysis Tools</h3>
                                    <div className="tools-tabs">
                                        <button
                                            className={`tool-tab ${activeAnalysisTab === 'annotations' ? 'active' : ''}`}
                                            onClick={() => setActiveAnalysisTab('annotations')}
                                        >
                                            Annotations
                                        </button>
                                        <button
                                            className={`tool-tab ${activeAnalysisTab === 'ai' ? 'active' : ''}`}
                                            onClick={() => setActiveAnalysisTab('ai')}
                                        >
                                            AI Analysis
                                        </button>
                                        <button
                                            className={`tool-tab ${activeAnalysisTab === 'media' ? 'active' : ''}`}
                                            onClick={() => setActiveAnalysisTab('media')}
                                        >
                                            Media
                                        </button>
                                    </div>
                                </div>

                                {/* Annotations Panel */}
                                {activeAnalysisTab === 'annotations' && (
                                    <div className="annotations-panel">
                                        <div className="annotation-input">
                                            <CustomDropdown
                                                value={annotationType}
                                                onChange={setAnnotationType}
                                                options={[
                                                    { value: "note", label: "Note" },
                                                    { value: "question", label: "Question" },
                                                    { value: "insight", label: "Insight" }
                                                ]}
                                                className="annotation-type-select"
                                            />
                                            <textarea
                                                value={newAnnotation}
                                                onChange={(e) => setNewAnnotation(e.target.value)}
                                                placeholder="Add your annotation..."
                                                className="annotation-textarea"
                                                rows="3"
                                            />
                                            <button
                                                onClick={handleAddAnnotation}
                                                className="add-annotation-btn"
                                                disabled={!newAnnotation.trim()}
                                            >
                                                Add Annotation
                                            </button>
                                        </div>

                                        {/* Existing Annotations */}
                                        {policyAnnotations.length > 0 && (
                                            <div className="existing-annotations">
                                                <h4>Your Annotations ({policyAnnotations.length})</h4>
                                                <div className="annotations-list">
                                                    {policyAnnotations.map((annotation, index) => (
                                                        <div key={annotation.id || index} className="annotation-item">
                                                            {editingAnnotation && editingAnnotation.id === annotation.id ? (
                                                                // Edit mode
                                                                <div className="annotation-edit-mode">
                                                                    <textarea
                                                                        value={editAnnotationContent}
                                                                        onChange={(e) => setEditAnnotationContent(e.target.value)}
                                                                        className="annotation-edit-textarea"
                                                                        rows="3"
                                                                    />
                                                                    <div className="annotation-edit-actions">
                                                                        <button
                                                                            onClick={handleSaveEditAnnotation}
                                                                            className="save-annotation-btn"
                                                                            disabled={!editAnnotationContent.trim()}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelEditAnnotation}
                                                                            className="cancel-annotation-btn"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // View mode
                                                                <>
                                                                    <div className="annotation-header">
                                                                        <div className="annotation-left">
                                                                            <span className="annotation-type">
                                                                                {annotation.type === 'note' ? 'Note' :
                                                                                    annotation.type === 'question' ? 'Question' : 'Insight'}
                                                                            </span>
                                                                            <span className="annotation-date">
                                                                                {formatDateForDisplay(annotation.created_at || annotation.timestamp)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="annotation-actions">
                                                                            <button
                                                                                onClick={() => handleEditAnnotation(annotation)}
                                                                                className="edit-annotation-btn"
                                                                                title="Edit annotation"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteAnnotation(annotation.id)}
                                                                                className="delete-annotation-btn"
                                                                                title="Delete annotation"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="annotation-content">
                                                                        {annotation.content}
                                                                    </div>
                                                                    {annotation.gemini_response && (
                                                                        <div className="annotation-gemini-response">
                                                                            <strong>AI Response:</strong>
                                                                            <div className="gemini-response-text">
                                                                                {annotation.gemini_response}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Gemini Analysis Panel */}
                                {activeAnalysisTab === 'ai' && (
                                    <div className="gemini-panel">
                                        <div className="gemini-controls">
                                            <div className="gemini-quick-actions">
                                                <button
                                                    onClick={() => handleGeminiAnalysis('safety_impact')}
                                                    disabled={geminiLoading}
                                                    className="gemini-btn"
                                                >
                                                    Safety Impact
                                                </button>
                                                <button
                                                    onClick={() => handleGeminiAnalysis('constitutional')}
                                                    disabled={geminiLoading}
                                                    className="gemini-btn"
                                                >
                                                    Constitutional
                                                </button>
                                                <button
                                                    onClick={() => handleGeminiAnalysis('effectiveness')}
                                                    disabled={geminiLoading}
                                                    className="gemini-btn"
                                                >
                                                    Effectiveness
                                                </button>
                                            </div>
                                            <div className="gemini-custom-question">
                                                <input
                                                    type="text"
                                                    value={geminiQuestion}
                                                    onChange={(e) => setGeminiQuestion(e.target.value)}
                                                    placeholder="Ask a specific question about this policy..."
                                                    className="gemini-question-input"
                                                />
                                                <button
                                                    onClick={() => handleGeminiAnalysis()}
                                                    disabled={geminiLoading || !geminiQuestion.trim()}
                                                    className="gemini-ask-btn"
                                                >
                                                    {geminiLoading ? 'Analyzing...' : 'Ask Gemini'}
                                                </button>
                                            </div>
                                        </div>

                                        {geminiResponse && (
                                            <div className="gemini-response">
                                                <h4>{getAnalysisTitle(currentAnalysisType)}</h4>
                                                <VisualAnalysisResponse
                                                    analysis={geminiResponse}
                                                    hideSectionTitles={currentAnalysisType !== null}
                                                    enableTypewriter={true}
                                                />
                                                <button
                                                    onClick={() => setGeminiResponse('')}
                                                    className="clear-response-btn"
                                                >
                                                    Clear Response
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Media Tab */}
                                {activeAnalysisTab === 'media' && (
                                    <div className="media-panel">
                                        <BookmarkMediaTab
                                            selectedState={currentPolicy?.state}
                                            selectedPolicy={currentPolicy}
                                            onBookmarkChange={refreshBookmarkedNewsArticles}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Policy Modal */}
            <PolicyModal
                isOpen={showPolicyModal}
                onClose={handleClosePolicyModal}
                policy={selectedPolicyForModal ? {
                    'Law ID': selectedPolicyForModal.law_id,
                    'State': selectedPolicyForModal.state,
                    'Law Class': selectedPolicyForModal.law_class,
                    'Effect': selectedPolicyForModal.effect,
                    'Effective Date Year': new Date(selectedPolicyForModal.effective_date).getFullYear(),
                    'Effective Date Month': new Date(selectedPolicyForModal.effective_date).getMonth() + 1,
                    'Effective Date Day': new Date(selectedPolicyForModal.effective_date).getDate(),
                    'Content': selectedPolicyForModal.original_content,
                    'Additional Context and Notes': selectedPolicyForModal.human_explanation,
                    // Include original fields for compatibility
                    ...selectedPolicyForModal
                } : null}
                year={selectedPolicyForModal ? new Date(selectedPolicyForModal.effective_date).getFullYear() : null}
                timelineData={timelineData}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content delete-modal">
                        <div className="modal-header">
                            <h3>Delete Annotation</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this annotation? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="cancel-btn"
                                onClick={cancelDeleteAnnotation}
                            >
                                Cancel
                            </button>
                            <button
                                className="delete-btn"
                                onClick={confirmDeleteAnnotation}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bookmark Removal Confirmation Modal */}
            {showBookmarkDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content delete-modal">
                        <div className="modal-header">
                            <h3>Remove Bookmark</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to remove this bookmark? This action cannot be undone.</p>
                            {bookmarkToDelete && (
                                <div className="bookmark-details">
                                    {bookmarkToDelete.law_id ? (
                                        // Policy bookmark
                                        <>
                                            <strong>{bookmarkToDelete.law_class}</strong>
                                            <br />
                                            <small>{bookmarkToDelete.state} • {formatDateForDisplay(bookmarkToDelete.effective_date)}</small>
                                        </>
                                    ) : (
                                        // News bookmark
                                        <>
                                            <strong>{bookmarkToDelete.title}</strong>
                                            <br />
                                            <small>{bookmarkToDelete.source} • {formatDateForDisplay(bookmarkToDelete.published)}</small>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="cancel-btn"
                                onClick={cancelRemoveBookmark}
                            >
                                Cancel
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={confirmRemoveBookmark}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;

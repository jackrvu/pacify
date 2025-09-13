// AnalyticsDashboard component - Session-based analytics without login
// Provides data analysis tools with local storage persistence

import React, { useState, useEffect, useMemo } from 'react';
import './AnalyticsDashboard.css';
import { getBookmarkedPolicies, unbookmarkPolicy, addAnnotation, updateAnnotation, removeAnnotation, bookmarkPolicy, isPolicyBookmarked } from '../utils/bookmarkService';
import { analyzePolicyWithGemini, getPolicyInsights, isGeminiAvailable } from '../utils/geminiService';
import VisualAnalysisResponse from './VisualAnalysisResponse';
import PolicyIncidentGraph from './PolicyIncidentGraph';
import PolicyModal from './PolicyModal';

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
    // Dashboard view state
    const [activeView, setActiveView] = useState('analytics'); // 'analytics', 'bookmarks', 'policy-details'

    // Bookmark state
    const [bookmarkedPolicies, setBookmarkedPolicies] = useState([]);
    const [selectedBookmark, setSelectedBookmark] = useState(null);
    const [showBookmarkModal, setShowBookmarkModal] = useState(false);
    const [bookmarkSearch, setBookmarkSearch] = useState('');

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

    // Load bookmarked policies
    useEffect(() => {
        const bookmarks = getBookmarkedPolicies();
        setBookmarkedPolicies(bookmarks);
    }, []);

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
        const result = unbookmarkPolicy(lawId);
        if (result.success) {
            setBookmarkedPolicies(prev => prev.filter(b => b.law_id !== lawId));
        } else {
            alert(result.message);
        }
    };

    const handleViewBookmark = (bookmark) => {
        console.log('handleViewBookmark called with bookmark:', bookmark);
        // Convert bookmark to policy format and set as current policy
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

    // Delete annotation handler
    const handleDeleteAnnotation = (annotationId) => {
        if (!currentPolicy || !window.confirm('Are you sure you want to delete this annotation?')) return;

        const result = removeAnnotation(currentPolicy.law_id, annotationId);

        if (result.success) {
            // Reload annotations
            const bookmarks = getBookmarkedPolicies();
            const bookmark = bookmarks.find(b => b.law_id === currentPolicy.law_id);
            if (bookmark && bookmark.annotations) {
                setPolicyAnnotations(bookmark.annotations);
            }
        } else {
            alert(result.message);
        }
    };

    // Get analysis title based on insight type
    const getAnalysisTitle = (insightType) => {
        const titles = {
            'safety_impact': '🛡️ Safety Impact Analysis',
            'constitutional': '⚖️ Constitutional Analysis',
            'effectiveness': '📊 Policy Effectiveness Analysis',
            'comparison': '🔄 State Comparison Analysis',
            'unintended': '⚠️ Unintended Consequences Analysis',
            'implementation': '🔧 Implementation Challenges Analysis'
        };
        return titles[insightType] || '🤖 AI Analysis';
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

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="session-info">
                </div>

                <div className="session-controls">
                    <div className="view-switcher">
                        <button
                            className={`view-btn ${activeView === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveView('analytics')}
                        >
                            Analytics
                        </button>
                        <button
                            className={`view-btn ${activeView === 'bookmarks' ? 'active' : ''}`}
                            onClick={() => setActiveView('bookmarks')}
                        >
                            Bookmarks ({bookmarkedPolicies.length})
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
                            <p>Browse enacted policies chronologically from our dataset</p>
                        </div>

                        {/* Policy Filters */}
                        <div className="policy-filters">
                            <div className="filter-group">
                                <label>State:</label>
                                <select
                                    value={policyFilter.state}
                                    onChange={(e) => setPolicyFilter(prev => ({ ...prev, state: e.target.value }))}
                                >
                                    <option value="all">All States</option>
                                    {uniqueStates.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Sort By:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="state">State Name (A-Z)</option>
                                    <option value="policy">Policy Name (A-Z)</option>
                                    <option value="date">Date (Newest First)</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Year:</label>
                                <select
                                    value={policyFilter.year}
                                    onChange={(e) => setPolicyFilter(prev => ({ ...prev, year: e.target.value }))}
                                >
                                    <option value="all">All Years</option>
                                    {uniqueYears.map(year => (
                                        <option key={year} value={year.toString()}>{year}</option>
                                    ))}
                                </select>
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
                                                    className="view-details-btn"
                                                    onClick={() => handleViewPolicyDetails(policy)}
                                                >
                                                    View Details
                                                </button>
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
                            <h2>Bookmarked Policies</h2>
                            <p>Manage your saved policies and annotations</p>
                        </div>

                        {/* Bookmarks Controls */}
                        <div className="bookmarks-controls">
                            <div className="bookmarks-filters">
                                <input
                                    type="text"
                                    value={bookmarkSearch}
                                    onChange={(e) => setBookmarkSearch(e.target.value)}
                                    placeholder="Search policies..."
                                    className="search-input"
                                />
                            </div>
                        </div>

                        {/* Bookmarks List */}
                        <div className="bookmarks-list">
                            {filteredBookmarks.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon"></div>
                                    <h3>No bookmarked policies</h3>
                                    <p>Bookmark policies from the map to see them here</p>
                                </div>
                            ) : (
                                filteredBookmarks.map((bookmark) => (
                                    <div key={bookmark.id} className="bookmark-card" onClick={() => handleViewBookmark(bookmark)}>
                                        <div className="bookmark-header">
                                            <div className="bookmark-title">
                                                <h3>{bookmark.law_class}</h3>
                                                <div className="bookmark-meta">
                                                    <span className="bookmark-state">{bookmark.state}</span>
                                                    <span
                                                        className={`bookmark-effect ${bookmark.effect?.toLowerCase()}`}
                                                    >
                                                        {bookmark.effect}
                                                    </span>
                                                    <span className="bookmark-date">
                                                        {formatDateForDisplay(bookmark.effective_date)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bookmark-actions">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveBookmark(bookmark.law_id);
                                                    }}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bookmark-content">
                                            <p className="bookmark-summary">
                                                {bookmark.original_content?.substring(0, 200)}...
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

                {activeView === 'policy-details' && currentPolicy && (
                    <div className="policy-details-view">
                        <div className="policy-details-header">
                            <button
                                onClick={handleBackToAnalytics}
                                className="back-btn"
                            >
                                ← Back to Analytics
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
                                            className={`tool-tab ${!showGeminiPanel ? 'active' : ''}`}
                                            onClick={() => setShowGeminiPanel(false)}
                                        >
                                            Annotations
                                        </button>
                                        <button
                                            className={`tool-tab ${showGeminiPanel ? 'active' : ''}`}
                                            onClick={() => setShowGeminiPanel(true)}
                                        >
                                            AI Analysis
                                        </button>
                                    </div>
                                </div>

                                {/* Annotations Panel */}
                                {!showGeminiPanel && (
                                    <div className="annotations-panel">
                                        <div className="annotation-input">
                                            <select
                                                value={annotationType}
                                                onChange={(e) => setAnnotationType(e.target.value)}
                                                className="annotation-type-select"
                                            >
                                                <option value="note">Note</option>
                                                <option value="question">Question</option>
                                                <option value="insight">Insight</option>
                                            </select>
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
                                                                        <span className="annotation-type">
                                                                            {annotation.type === 'note' ? 'Note' :
                                                                                annotation.type === 'question' ? 'Question' : 'Insight'}
                                                                        </span>
                                                                        <span className="annotation-date">
                                                                            {formatDateForDisplay(annotation.created_at || annotation.timestamp)}
                                                                        </span>
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
                                {showGeminiPanel && (
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
        </div>
    );
};

export default AnalyticsDashboard;

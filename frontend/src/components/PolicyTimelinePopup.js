// PolicyTimelinePopup component - displays gun policy timeline for selected states
// Shows policy changes over time with interactive timeline controls and modal details
// Supports auto-play, manual scrubbing, and detailed policy information display
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './PolicyTimelinePopup.css';
import { bookmarkPolicy, unbookmarkPolicy, isPolicyBookmarked } from '../utils/bookmarkService';

const PolicyTimelinePopup = ({
    isVisible,
    onClose,
    availableYears = [],
    currentYear,
    onYearChange,
    onPolicyClick,
    selectedState = null,
    onViewPolicyDetails = null
}) => {
    const [policyData, setPolicyData] = useState([]);
    const [loadingPolicy, setLoadingPolicy] = useState(false);
    const [policyAnalysisData, setPolicyAnalysisData] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);

    // Timeline controls state
    const [isPlaying, setIsPlaying] = useState(false);
    const isPlayingRef = useRef(false);
    const intervalRef = useRef(null);

    // Continuous timeline position state
    const [continuousPosition, setContinuousPosition] = useState(0); // 0-100 percentage
    const animationFrameRef = useRef(null);

    // Resize state
    const [panelHeight, setPanelHeight] = useState(200);
    const [isResizing, setIsResizing] = useState(false);

    // Modal state
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const modalBodyRef = useRef(null);

    // Get policies for the timeline range
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);

    // Convert between continuous position (0-100) and year - defined early to avoid hoisting issues
    const positionToYear = (position) => {
        return minYear + (position / 100) * (maxYear - minYear);
    };

    const yearToPosition = (year) => {
        return ((year - minYear) / (maxYear - minYear)) * 100;
    };

    // Load policy data when component mounts
    useEffect(() => {
        const loadPolicyData = async () => {
            try {
                setLoadingPolicy(true);

                // Load policy analysis JSON data directly as the primary source
                const analysisResponse = await fetch('/policy_analysis_results.json');

                if (!analysisResponse.ok) {
                    throw new Error(`Failed to fetch policy data: ${analysisResponse.status} ${analysisResponse.statusText}`);
                }

                const responseText = await analysisResponse.text();

                // Clean up any NaN values in the JSON before parsing
                const cleanedJson = responseText.replace(/:\s*NaN\s*,/g, ': null,').replace(/:\s*NaN\s*}/g, ': null}');

                let analysisData;
                try {
                    analysisData = JSON.parse(cleanedJson);
                } catch (parseError) {
                    console.error('JSON Parse Error:', parseError);
                    console.error('Problem area:', responseText.substring(Math.max(0, parseError.message.indexOf('position') - 50), parseError.message.indexOf('position') + 100));
                    throw new Error(`Invalid JSON format: ${parseError.message}`);
                }

                // Validate that we have an array
                if (!Array.isArray(analysisData)) {
                    throw new Error('Policy data should be an array');
                }

                // Filter out any invalid entries and validate required fields
                const validPolicies = analysisData.filter(policy => {
                    return policy &&
                        typeof policy === 'object' &&
                        policy.effective_date &&
                        policy.state &&
                        policy.law_id;
                });

                console.log(`Loaded ${validPolicies.length} valid policies out of ${analysisData.length} total entries`);

                // Set both policy data and analysis data from the JSON file
                setPolicyData(validPolicies);
                setPolicyAnalysisData(validPolicies);
                setLoadingPolicy(false);
            } catch (error) {
                console.error('Error loading policy data:', error);
                setPolicyData([]);
                setPolicyAnalysisData([]);
                setLoadingPolicy(false);
            }
        };

        if (isVisible && policyData.length === 0) {
            loadPolicyData();
        }
    }, [isVisible, policyData.length]);

    // Note: Removed the effect that was resetting modal state when selectedState changes
    // This was causing the modal to reload instead of smoothly updating content

    // Update continuous position when current year changes (but not when dragging)
    useEffect(() => {
        if (!isDragging && !isPlaying) {
            setContinuousPosition(yearToPosition(currentYear));
        }
    }, [currentYear, isDragging, isPlaying, yearToPosition]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setIsPlaying(false);
            isPlayingRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, []);

    // Resize handlers for policy timeline
    const handleResizeMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleResizeMouseMove = (e) => {
        if (!isResizing) return;

        const newHeight = window.innerHeight - e.clientY;
        const minHeight = 150;
        const maxHeight = window.innerHeight * 0.6;

        if (newHeight >= minHeight && newHeight <= maxHeight) {
            setPanelHeight(newHeight);
        }
    };

    const handleResizeMouseUp = () => {
        setIsResizing(false);
    };

    // Add event listeners for resize
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleResizeMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    // Group policies by year for timeline display, filtered by selected state
    const policiesByYear = useMemo(() => {
        if (!policyData.length) return {};

        const grouped = {};

        policyData.forEach(policy => {
            // Extract year from effective_date field (format: YYYY-M-D)
            const effectiveDate = policy.effective_date;
            if (!effectiveDate) return;

            const year = parseInt(effectiveDate.split('-')[0]);
            const state = policy.state;

            // Only include policies for the selected state (if one is selected)
            if (year && year >= 1995 && year <= 2025) {
                if (selectedState && state && state.toLowerCase() !== selectedState.toLowerCase()) {
                    return; // Skip this policy if it's not for the selected state
                }

                if (!grouped[year]) {
                    grouped[year] = [];
                }
                grouped[year].push(policy);
            }
        });

        return grouped;
    }, [policyData, selectedState]);

    // Simple year increment function - just go to next year every 2 seconds
    const incrementYear = useCallback(() => {
        const currentIndex = availableYears.indexOf(currentYear);
        const nextIndex = (currentIndex + 1) % availableYears.length;
        const nextYear = availableYears[nextIndex];

        onYearChange(nextYear);
    }, [availableYears, currentYear, onYearChange]);

    // Smooth auto-play animation
    const startAutoPlay = useCallback(() => {
        if (availableYears.length === 0) return;

        // Clear existing animations
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        setIsPlaying(true);
        isPlayingRef.current = true;

        const startPosition = yearToPosition(currentYear);
        const endPosition = 100; // Go to end of timeline
        const duration = (availableYears.length - availableYears.indexOf(currentYear)) * 2000; // 2 seconds per year
        const startTime = Date.now();

        const animate = () => {
            if (!isPlayingRef.current) return;

            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth easing
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const currentPosition = startPosition + (endPosition - startPosition) * easeProgress;
            setContinuousPosition(currentPosition);

            // Calculate discrete year for data updates
            const currentFloatYear = positionToYear(currentPosition);
            const discreteYear = Math.round(currentFloatYear);

            // Update discrete year when we cross year boundaries
            if (availableYears.includes(discreteYear) && discreteYear !== currentYear) {
                onYearChange(discreteYear);
            }

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Loop back to start
                onYearChange(availableYears[0]);
                setContinuousPosition(yearToPosition(availableYears[0]));
                // Restart animation after a brief pause
                setTimeout(() => {
                    if (isPlayingRef.current) {
                        startAutoPlay();
                    }
                }, 500);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [availableYears, currentYear, onYearChange, yearToPosition, positionToYear]);

    // Stop auto-play animation
    const stopAutoPlay = useCallback(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        // Snap to current discrete year position
        setContinuousPosition(yearToPosition(currentYear));
    }, [currentYear, yearToPosition]);

    // Handle play/pause
    const handlePlayPause = () => {
        if (isPlaying) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    };


    // Handle policy marker click
    const handlePolicyMarkerClick = (year, policies, event) => {
        event.stopPropagation();
        setSelectedPolicy({ year, policies });
        setShowPolicyModal(true);
        // Update map data to show the selected year
        if (onYearChange) {
            onYearChange(year);
        }
        if (onPolicyClick) {
            onPolicyClick(year, policies);
        }
    };

    // Handle dragging the year indicator with smooth movement
    const handleIndicatorDrag = (event) => {
        event.preventDefault();
        setIsDragging(true);

        const timelineTrack = event.currentTarget.parentElement;
        const timelineRect = timelineTrack.getBoundingClientRect();
        let currentDragPosition = continuousPosition; // Store the drag position locally

        const getEventX = (e) => {
            // Handle both mouse and touch events
            return e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        };

        const handleMove = (e) => {
            const x = getEventX(e) - timelineRect.left;
            const percentage = Math.max(0, Math.min(100, (x / timelineRect.width) * 100));

            // Store the current drag position
            currentDragPosition = percentage;

            // Update continuous position immediately for smooth movement
            setContinuousPosition(percentage);

            // Convert to nearest year for data updates
            const floatYear = positionToYear(percentage);
            const nearestYear = Math.round(floatYear);

            // Only update discrete year if it's valid and different
            if (availableYears.includes(nearestYear) && nearestYear !== currentYear) {
                onYearChange(nearestYear);
            }
        };

        const handleEnd = () => {
            setIsDragging(false);

            // Use the actual drag position, not the state value
            const floatYear = positionToYear(currentDragPosition);
            const roundedYear = Math.round(floatYear);

            // Find the closest available year to the rounded year
            const snapYear = availableYears.reduce((prev, curr) =>
                Math.abs(curr - roundedYear) < Math.abs(prev - roundedYear) ? curr : prev
            );

            onYearChange(snapYear);
            setContinuousPosition(yearToPosition(snapYear));

            // Remove all event listeners
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };

        // Add both mouse and touch event listeners
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    // Handle back button click
    const handleBackToTimeline = () => {
        setShowPolicyModal(false);
        setSelectedPolicy(null);
    };


    // Calculate position for policy markers
    const getPolicyMarkerPosition = (year) => {
        return ((year - minYear) / (maxYear - minYear)) * 100;
    };

    // Get color for policy effect
    const getPolicyEffectColor = (effect) => {
        if (!effect) return '#666';
        switch (effect.toLowerCase()) {
            case 'restrictive':
                return '#DC143C'; // Crimson
            case 'permissive':
                return '#228B22'; // Forest Green
            default:
                return '#666'; // Gray
        }
    };

    // Format policy date from effective_date string (format: YYYY-M-D)
    const formatPolicyDate = (effectiveDateStr) => {
        if (!effectiveDateStr) return 'Unknown Date';

        try {
            const [year, month, day] = effectiveDateStr.split('-').map(num => parseInt(num));
            const date = new Date(year, (month || 1) - 1, day || 1);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return effectiveDateStr; // Return the original string if parsing fails
        }
    };

    // Capitalize first letter of each word in policy name
    const capitalizePolicyName = (policyName) => {
        if (!policyName) return 'Unknown Law Class';
        return policyName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Get Gemini analysis for a policy
    const getGeminiAnalysis = (policyLawId) => {
        if (!policyAnalysisData.length || !policyLawId) return null;
        return policyAnalysisData.find(analysis => analysis.law_id === policyLawId);
    };

    if (!isVisible) return null;


    // Policy modal overlay
    const PolicyModal = () => {
        if (!showPolicyModal || !selectedPolicy) return null;

        // Individual policy bookmark component
        const PolicyBookmarkButton = ({ policy }) => {
            const [bookmarkState, setBookmarkState] = useState(isPolicyBookmarked(policy.law_id));

            // Update bookmark state when policy changes
            useEffect(() => {
                setBookmarkState(isPolicyBookmarked(policy.law_id));
            }, [policy.law_id]);

            const handleBookmarkClick = (e) => {
                e.stopPropagation();
                if (bookmarkState) {
                    const result = unbookmarkPolicy(policy.law_id);
                    if (result.success) {
                        setBookmarkState(false);
                    } else {
                        alert(result.message);
                    }
                } else {
                    const policyData = {
                        law_id: policy.law_id,
                        state: policy.state,
                        law_class: policy.law_class,
                        effect: policy.effect,
                        effective_date: policy.effective_date,
                        original_content: policy.original_content,
                        human_explanation: policy.human_explanation,
                        mass_shooting_analysis: policy.mass_shooting_analysis,
                        state_mass_shooting_stats: policy.state_mass_shooting_stats
                    };
                    const result = bookmarkPolicy(policyData);
                    if (result.success) {
                        setBookmarkState(true);
                    } else {
                        alert(result.message);
                    }
                }
            };

            return (
                <button
                    className={`policy-bookmark-btn ${bookmarkState ? 'bookmarked' : ''}`}
                    onClick={handleBookmarkClick}
                    title={bookmarkState ? 'Remove bookmark' : 'Bookmark policy'}
                >
                    {bookmarkState ? '★' : '☆'}
                </button>
            );
        };

        return (
            <div className="policy-modal-overlay" onClick={handleBackToTimeline}>
                <div className="policy-modal-dialog" onClick={(e) => e.stopPropagation()}>
                    <div className="policy-modal-header">
                        <h2>
                            Policy Changes in {selectedPolicy.year}
                            {selectedState && <span className="modal-state-subtitle">&nbsp;&nbsp;for {selectedState}</span>}
                        </h2>
                        <button
                            className="modal-close-btn"
                            onClick={handleBackToTimeline}
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                    </div>

                    <div className="policy-modal-body" ref={modalBodyRef}>
                        <div className="policy-summary">
                            <h3>{selectedPolicy.policies.length} Policy Change{selectedPolicy.policies.length === 1 ? '' : 's'}</h3>
                            <p>Implemented in {selectedPolicy.year}</p>
                        </div>

                        <div className="policy-changes-list">
                            {selectedPolicy.policies.map((policy, index) => {
                                const policyId = policy.law_id || `policy-${index}`;
                                const hasContent = policy.original_content && policy.original_content.trim().length > 0;
                                const geminiAnalysis = getGeminiAnalysis(policy.law_id);

                                return (
                                    <div key={policyId} className="policy-change-item">
                                        <div className="policy-change-header">
                                            <div className="policy-change-title-section">
                                                <div className="policy-change-title">
                                                    {capitalizePolicyName(policy.law_class)}
                                                </div>
                                                <span
                                                    className="policy-effect-badge"
                                                    style={{
                                                        backgroundColor: getPolicyEffectColor(policy.effect),
                                                        color: 'white'
                                                    }}
                                                >
                                                    {policy.effect || 'Unknown'}
                                                </span>
                                            </div>
                                            <div className="policy-change-meta">
                                                <PolicyBookmarkButton policy={policy} />
                                                <span className="policy-state">{policy.state}</span>
                                            </div>
                                        </div>

                                        <div className="policy-change-date">
                                            Effective: {formatPolicyDate(policy.effective_date)}
                                        </div>

                                        {/* Gemini Policy Summary & Analysis */}
                                        {geminiAnalysis && (
                                            <div className="gemini-policy-analysis">
                                                <h4 className="gemini-analysis-title">Gemini Policy Summary & Analysis</h4>

                                                {geminiAnalysis.human_explanation && (
                                                    <div className="gemini-human-explanation">
                                                        <h5>Policy Explanation</h5>
                                                        <div className="analysis-content">
                                                            {geminiAnalysis.human_explanation.split('\n').map((paragraph, idx) => (
                                                                <p key={idx}>{paragraph}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {geminiAnalysis.mass_shooting_analysis && (
                                                    <div className="gemini-mass-shooting-analysis">
                                                        <h5>Mass Shooting Impact Analysis</h5>
                                                        <div className="analysis-content">
                                                            {geminiAnalysis.mass_shooting_analysis.split('\n').map((paragraph, idx) => (
                                                                <p key={idx}>{paragraph}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {geminiAnalysis.state_mass_shooting_stats && (
                                                    <div className="gemini-stats">
                                                        <h5>State Mass Shooting Statistics (2019-2025)</h5>
                                                        <div className="stats-grid">
                                                            <div className="stat-item">
                                                                <span className="stat-label">Total Incidents:</span>
                                                                <span className="stat-value">{geminiAnalysis.state_mass_shooting_stats.total_2019_2025}</span>
                                                            </div>
                                                            <div className="stat-item">
                                                                <span className="stat-label">Avg per Year:</span>
                                                                <span className="stat-value">{geminiAnalysis.state_mass_shooting_stats.avg_per_year.toFixed(1)}</span>
                                                            </div>
                                                            <div className="stat-item">
                                                                <span className="stat-label">Total Killed:</span>
                                                                <span className="stat-value">{geminiAnalysis.state_mass_shooting_stats.total_victims_killed}</span>
                                                            </div>
                                                            <div className="stat-item">
                                                                <span className="stat-label">Total Injured:</span>
                                                                <span className="stat-value">{geminiAnalysis.state_mass_shooting_stats.total_victims_injured}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {hasContent && (
                                            <div className="policy-change-description">
                                                <div className="policy-description-full">
                                                    {policy.original_content}
                                                </div>
                                            </div>
                                        )}

                                        {!hasContent && (
                                            <div className="policy-no-description">
                                                No additional details available for this policy change.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Policy Modal */}
            <PolicyModal />

            {/* Main Timeline Popup */}
            <div
                className={`policy-timeline-popup ${isResizing ? 'resizing' : ''}`}
                style={{ height: `${panelHeight}px` }}
            >
                {/* Resize handle */}
                <div
                    className="resize-handle-top"
                    onMouseDown={handleResizeMouseDown}
                />
                <div className="timeline-popup-header">
                    <div className="timeline-title">
                        <h3>
                            Gun Policy Timeline
                            {selectedState && ` - ${selectedState}`}
                        </h3>
                        <span className="current-year-display">{currentYear}</span>
                    </div>
                    <div className="timeline-header-controls">
                        <button
                            className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
                            onClick={handlePlayPause}
                            title={isPlaying ? 'Pause timeline' : 'Play timeline'}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <button className="close-timeline-btn" onClick={onClose} aria-label="Close timeline">
                            ×
                        </button>
                    </div>
                </div>

                <div className="timeline-container">
                    {!selectedState && (
                        <div className="timeline-hint-message">
                            <p>Click on a state on the map to view state-specific policy changes</p>
                        </div>
                    )}
                    <div className="timeline-track">
                        {/* Timeline line */}
                        <div className="timeline-line"></div>

                        {/* Policy markers */}
                        <div className="policy-markers">
                            {Object.entries(policiesByYear).map(([year, policies]) => {
                                const yearNum = parseInt(year);
                                if (yearNum < minYear || yearNum > maxYear) return null;

                                const restrictivePolicies = policies.filter(p =>
                                    p.effect && p.effect.toLowerCase() === 'restrictive'
                                );
                                const permissivePolicies = policies.filter(p =>
                                    p.effect && p.effect.toLowerCase() === 'permissive'
                                );

                                return (
                                    <div
                                        key={year}
                                        className="policy-marker"
                                        style={{ left: `${getPolicyMarkerPosition(yearNum)}%` }}
                                        onClick={(e) => handlePolicyMarkerClick(yearNum, policies, e)}
                                        title={`${policies.length} policy change${policies.length === 1 ? '' : 's'} in ${year} - Click to view details`}
                                    >
                                        <div className="policy-marker-dot">
                                            <div className="policy-count">{policies.length}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                        {/* Current year indicator */}
                        <div
                            className={`current-year-indicator ${(isDragging || isPlaying) ? 'no-transition' : ''}`}
                            style={{ left: `${continuousPosition}%` }}
                            onMouseDown={handleIndicatorDrag}
                            onTouchStart={handleIndicatorDrag}
                        >
                            <div className="indicator-line"></div>
                            <div className="indicator-label">{currentYear}</div>
                        </div>
                    </div>

                    {/* Year labels below timeline */}
                    <div className="year-labels">
                        {availableYears.map((year, index) => {
                            // Show more years for closer spacing - reduced from 60 to 80 for even tighter spacing
                            // Show both even and odd years for better coverage
                            const shouldShow = (index % Math.ceil(availableYears.length / 80) === 0) ||
                                year === minYear ||
                                year === maxYear ||
                                year === currentYear;

                            if (!shouldShow) return null;

                            return (
                                <div
                                    key={year}
                                    className="year-label"
                                    style={{ left: `${yearToPosition(year)}%` }}
                                >
                                    {year}
                                </div>
                            );
                        })}
                    </div>

                </div>

                {loadingPolicy && (
                    <div className="loading-overlay">
                        <div className="loading-text">Loading policy data...</div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PolicyTimelinePopup;

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import './PolicyTimelinePopup.css';

const PolicyTimelinePopup = ({
    isVisible,
    onClose,
    availableYears = [],
    currentYear,
    onYearChange,
    onPolicyClick,
    selectedState = null
}) => {
    const [policyData, setPolicyData] = useState([]);
    const [loadingPolicy, setLoadingPolicy] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);

    // Timeline controls state
    const [isPlaying, setIsPlaying] = useState(false);
    const isPlayingRef = useRef(false);
    const intervalRef = useRef(null);

    // Resize state
    const [panelHeight, setPanelHeight] = useState(200);
    const [isResizing, setIsResizing] = useState(false);

    // Modal state
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    // Load policy data when component mounts
    useEffect(() => {
        const loadPolicyData = async () => {
            try {
                setLoadingPolicy(true);
                const response = await fetch('/data/policy_sorted.csv');
                const csvText = await response.text();

                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setPolicyData(results.data);
                        setLoadingPolicy(false);
                    },
                    error: (error) => {
                        console.error('Error parsing policy CSV:', error);
                        setLoadingPolicy(false);
                    }
                });
            } catch (error) {
                console.error('Error loading policy data:', error);
                setLoadingPolicy(false);
            }
        };

        if (isVisible && policyData.length === 0) {
            loadPolicyData();
        }
    }, [isVisible, policyData.length]);

    // Reset modal state when selectedState changes
    useEffect(() => {
        if (showPolicyModal) {
            setShowPolicyModal(false);
            setSelectedPolicy(null);
        }
    }, [selectedState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setIsPlaying(false);
            isPlayingRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
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
            const year = parseInt(policy['Effective Date Year']);
            const state = policy.State;

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

    // Get policies for the timeline range
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);

    // Simple year increment function - just go to next year every 2 seconds
    const incrementYear = useCallback(() => {
        const currentIndex = availableYears.indexOf(currentYear);
        const nextIndex = (currentIndex + 1) % availableYears.length;
        const nextYear = availableYears[nextIndex];

        onYearChange(nextYear);
    }, [availableYears, currentYear, onYearChange]);

    // Start simple year increment
    const startAutoPlay = useCallback(() => {
        if (availableYears.length === 0) return;

        // Clear existing interval if any
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setIsPlaying(true);
        isPlayingRef.current = true;

        // Use interval instead of recursive setTimeout
        intervalRef.current = setInterval(() => {
            if (!isPlayingRef.current) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                return;
            }

            // We need to access the latest state here
            onYearChange(prevYear => {
                const currentIndex = availableYears.indexOf(prevYear);
                const nextIndex = (currentIndex + 1) % availableYears.length;
                return availableYears[nextIndex];
            });
        }, 2000);
    }, [availableYears, onYearChange]);

    // Stop year increment
    const stopAutoPlay = useCallback(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Handle play/pause
    const handlePlayPause = () => {
        if (isPlaying) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    };

    // Handle slider change
    const handleSliderChange = (event) => {
        const year = parseInt(event.target.value);
        onYearChange(year);
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

    // Format policy date
    const formatPolicyDate = (year, month, day) => {
        if (!year) return 'Unknown Date';

        const date = new Date(year, (month || 1) - 1, day || 1);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!isVisible) return null;

    // Show policy modal if a policy is selected
    if (showPolicyModal && selectedPolicy) {
        return (
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
                        <button
                            className="back-to-timeline-btn"
                            onClick={handleBackToTimeline}
                            title="Back to timeline"
                        >
                            ← Back
                        </button>
                        <h3>
                            Policy Changes in {selectedPolicy.year}
                            {selectedState && ` - ${selectedState}`}
                        </h3>
                    </div>
                    <button className="close-timeline-btn" onClick={onClose} aria-label="Close timeline">
                        ×
                    </button>
                </div>

                <div className="policy-modal-content">
                    <div className="policy-modal-header">
                        <h4>
                            {selectedPolicy.policies.length} Policy Changes in {selectedPolicy.year}
                            {selectedState && ` for ${selectedState}`}
                        </h4>
                        <p className="policy-modal-subtitle">
                            Policy changes implemented in {selectedPolicy.year}
                            {selectedState && ` for ${selectedState}`}
                        </p>
                    </div>

                    <div className="policy-modal-list">
                        {selectedPolicy.policies.map((policy, index) => (
                            <div
                                key={policy['Law ID'] || index}
                                className="policy-modal-item"
                            >
                                <div className="policy-modal-item-header">
                                    <span className="policy-state">{policy.State}</span>
                                    <span
                                        className="policy-effect"
                                        style={{ color: getPolicyEffectColor(policy.Effect) }}
                                    >
                                        {policy.Effect || 'Unknown'}
                                    </span>
                                </div>
                                <div className="policy-modal-item-title">
                                    {policy['Law Class'] || 'Unknown Law Class'}
                                </div>
                                <div className="policy-modal-item-date">
                                    {formatPolicyDate(
                                        policy['Effective Date Year'],
                                        policy['Effective Date Month'],
                                        policy['Effective Date Day']
                                    )}
                                </div>
                                {policy['Description'] && (
                                    <div className="policy-modal-item-description">
                                        {policy['Description']}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
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
                <div className="timeline-controls">
                    <button
                        className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
                        onClick={handlePlayPause}
                        title={isPlaying ? 'Pause timeline' : 'Play timeline'}
                    >
                        {isPlaying ? '⏸️' : '▶️'}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                </div>
                <button className="close-timeline-btn" onClick={onClose} aria-label="Close timeline">
                    ×
                </button>
            </div>

            <div className="timeline-container">
                {!selectedState && (
                    <div className="timeline-hint-message">
                        <p>Click on a state on the map to view state-specific policy changes</p>
                    </div>
                )}
                <div className="timeline-track">
                    {/* Main year slider */}
                    <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={currentYear}
                        onChange={handleSliderChange}
                        className="timeline-slider"
                        step="1"
                    />

                    {/* Policy markers */}
                    <div className="policy-markers">
                        {Object.entries(policiesByYear).map(([year, policies]) => {
                            const yearNum = parseInt(year);
                            if (yearNum < minYear || yearNum > maxYear) return null;

                            const restrictivePolicies = policies.filter(p =>
                                p.Effect && p.Effect.toLowerCase() === 'restrictive'
                            );
                            const permissivePolicies = policies.filter(p =>
                                p.Effect && p.Effect.toLowerCase() === 'permissive'
                            );

                            return (
                                <div
                                    key={year}
                                    className="policy-marker"
                                    style={{ left: `${getPolicyMarkerPosition(yearNum)}%` }}
                                    onClick={(e) => handlePolicyMarkerClick(yearNum, policies, e)}
                                    title={`${policies.length} policy changes in ${year}`}
                                >
                                    <div className="policy-marker-dot">
                                        <div className="policy-count">{policies.length}</div>
                                    </div>
                                    <div className="policy-marker-year">{year}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Year labels */}
                    <div className="year-labels">
                        {availableYears.filter((_, index) => index % 3 === 0).map(year => (
                            <div
                                key={year}
                                className="year-label"
                                style={{ left: `${getPolicyMarkerPosition(year)}%` }}
                            >
                                {year}
                            </div>
                        ))}
                    </div>

                    {/* Current year indicator */}
                    <div
                        className="current-year-indicator"
                        style={{ left: `${getPolicyMarkerPosition(currentYear)}%` }}
                    >
                        <div className="indicator-line"></div>
                        <div className="indicator-label">{currentYear}</div>
                    </div>
                </div>

            </div>

            {loadingPolicy && (
                <div className="loading-overlay">
                    <div className="loading-text">Loading policy data...</div>
                </div>
            )}
        </div>
    );
};

export default PolicyTimelinePopup;

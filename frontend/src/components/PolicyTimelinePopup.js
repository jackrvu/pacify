import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import './PolicyTimelinePopup.css';

const PolicyTimelinePopup = ({
    isVisible,
    onClose,
    availableYears = [],
    currentYear,
    onYearChange,
    onPolicyClick
}) => {
    const [policyData, setPolicyData] = useState([]);
    const [loadingPolicy, setLoadingPolicy] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);

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

    // Group policies by year for timeline display
    const policiesByYear = useMemo(() => {
        if (!policyData.length) return {};

        const grouped = {};

        policyData.forEach(policy => {
            const year = parseInt(policy['Effective Date Year']);
            if (year && year >= 1995 && year <= 2025) {
                if (!grouped[year]) {
                    grouped[year] = [];
                }
                grouped[year].push(policy);
            }
        });

        return grouped;
    }, [policyData]);

    // Get policies for the timeline range
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);

    // Handle slider change
    const handleSliderChange = (event) => {
        const year = parseInt(event.target.value);
        onYearChange(year);
    };

    // Handle policy marker click
    const handlePolicyMarkerClick = (year, policies, event) => {
        event.stopPropagation();
        setSelectedPolicy({ year, policies });
        if (onPolicyClick) {
            onPolicyClick(year, policies);
        }
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

    return (
        <div className="policy-timeline-popup">
            <div className="timeline-popup-header">
                <div className="timeline-title">
                    <h3>Gun Policy Timeline</h3>
                    <span className="current-year-display">{currentYear}</span>
                </div>
                <button className="close-timeline-btn" onClick={onClose} aria-label="Close timeline">
                    ×
                </button>
            </div>

            <div className="timeline-container">
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

                {/* Policy details dropdown */}
                {selectedPolicy && (
                    <div className="policy-details-dropdown">
                        <div className="policy-details-header">
                            <h4>Policy Changes in {selectedPolicy.year}</h4>
                            <button
                                className="close-details-btn"
                                onClick={() => setSelectedPolicy(null)}
                                aria-label="Close policy details"
                            >
                                ×
                            </button>
                        </div>
                        <div className="policy-details-list">
                            {selectedPolicy.policies.slice(0, 10).map((policy, index) => (
                                <div
                                    key={policy['Law ID'] || index}
                                    className="policy-detail-item"
                                    onClick={() => onPolicyClick(selectedPolicy.year, [policy])}
                                >
                                    <div className="policy-detail-header">
                                        <span className="policy-state">{policy.State}</span>
                                        <span
                                            className="policy-effect"
                                            style={{ color: getPolicyEffectColor(policy.Effect) }}
                                        >
                                            {policy.Effect || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="policy-detail-title">
                                        {policy['Law Class'] || 'Unknown Law Class'}
                                    </div>
                                    <div className="policy-detail-date">
                                        {formatPolicyDate(
                                            policy['Effective Date Year'],
                                            policy['Effective Date Month'],
                                            policy['Effective Date Day']
                                        )}
                                    </div>
                                </div>
                            ))}
                            {selectedPolicy.policies.length > 10 && (
                                <div className="more-policies-indicator">
                                    +{selectedPolicy.policies.length - 10} more policies
                                </div>
                            )}
                        </div>
                    </div>
                )}
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

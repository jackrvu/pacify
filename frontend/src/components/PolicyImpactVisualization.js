// PolicyImpactVisualization component - displays policy impact analysis
// Shows before/after comparisons, statistical significance, and control state analysis
// Integrates with existing policy data and timeline system

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './PolicyImpactVisualization.css';

const PolicyImpactVisualization = ({
    isVisible,
    onClose,
    selectedPolicy = null,
    availablePolicyAnalyses = []
}) => {
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'comparison', 'summary'
    const [filterPolicyType, setFilterPolicyType] = useState('all');
    const [sortBy, setSortBy] = useState('impact'); // 'impact', 'state', 'year'

    // Load available policy analyses on mount
    useEffect(() => {
        const loadAvailableAnalyses = async () => {
            try {
                // Load ULTIMATE comprehensive analysis index
                const response = await fetch('/data/ultimate_policy_analysis_index.json');
                const indexData = await response.json();

                console.log(`🎉 Loaded ${indexData.total_analyses} policy analyses!`);
                console.log(`📊 Policy types: ${indexData.policy_types ? indexData.policy_types.length : 'N/A'}`);
                console.log(`🗺️ States covered: ${indexData.states ? indexData.states.length : 'N/A'}`);
                console.log(`📈 Raw analyses array:`, indexData.analyses ? indexData.analyses.length : 'No analyses array');

                // Ensure we have analyses array
                if (!indexData.analyses || !Array.isArray(indexData.analyses)) {
                    console.error('❌ No analyses array found in data:', indexData);
                    window.policyAnalyses = [];
                    return;
                }

                // Convert to our format with additional metadata
                const analyses = indexData.analyses.map(analysis => ({
                    ...analysis,
                    name: `${analysis.state} ${analysis.policy_type} (${analysis.year})`,
                    significance: analysis.significance === true || analysis.significance === 'True' || analysis.significance === true
                }));

                console.log(`✅ Processed ${analyses.length} analyses for display`);

                // Set default selection to the most impactful analysis
                if (analyses.length > 0 && !selectedAnalysis) {
                    // Find the analysis with highest absolute impact
                    const topAnalysis = analyses.reduce((prev, current) =>
                        Math.abs(current.impact || 0) > Math.abs(prev.impact || 0) ? current : prev
                    );
                    setSelectedAnalysis(topAnalysis);
                }

                // Store analyses for filtering/sorting
                window.policyAnalyses = analyses;
                console.log(`🚀 Stored ${analyses.length} analyses in window.policyAnalyses`);

                // Trigger state update
                setAvailableAnalyses(analyses);

                /* Old hardcoded analyses - replaced with dynamic loading
                const analyses = [
                    // Background Check Policies
                    { 
                        id: 'alabama_bg_1998',
                        name: 'Alabama Background Checks (1998)',
                        file: 'policy_impact_alabama_bg_check_1998_clean.json',
                        policy_type: 'Background Check',
                        state: 'Alabama',
                        year: 1998,
                        impact: -60.5,
                        significance: true,
                        category: 'restrictive'
                    },
                    { 
                        id: 'california_bg_2015',
                        name: 'California Background Checks (2015)',
                        file: 'policy_impact_california_bg_check_2015_clean.json',
                        policy_type: 'Background Check',
                        state: 'California',
                        year: 2015,
                        impact: -1.7,
                        significance: true,
                        category: 'restrictive'
                    },
                    { 
                        id: 'new_york_bg_2019',
                        name: 'New York Background Checks (2019)',
                        file: 'policy_impact_new_york_bg_check_2019.json',
                        policy_type: 'Background Check',
                        state: 'New York',
                        year: 2019,
                        impact: -89.6,
                        significance: true,
                        category: 'restrictive'
                    },
                    { 
                        id: 'connecticut_bg_2014',
                        name: 'Connecticut Background Checks (2014)',
                        file: 'policy_impact_connecticut_bg_check_2014.json',
                        policy_type: 'Background Check',
                        state: 'Connecticut',
                        year: 2014,
                        impact: -21.9,
                        significance: true,
                        category: 'restrictive'
                    },
                    { 
                        id: 'colorado_bg_2021',
                        name: 'Colorado Background Checks (2021)',
                        file: 'policy_impact_colorado_bg_check_2021.json',
                        policy_type: 'Background Check',
                        state: 'Colorado',
                        year: 2021,
                        impact: -81.5,
                        significance: true,
                        category: 'restrictive'
                    },
                    { 
                        id: 'washington_bg_2024',
                        name: 'Washington Background Checks (2024)',
                        file: 'policy_impact_washington_bg_check_2024.json',
                        policy_type: 'Background Check',
                        state: 'Washington',
                        year: 2024,
                        impact: -48.1,
                        significance: true,
                        category: 'restrictive'
                    },
                    
                    // Concealed Carry Policies
                    { 
                        id: 'texas_cc_2021',
                        name: 'Texas Constitutional Carry (2021)',
                        file: 'policy_impact_texas_concealed_carry_2021.json',
                        policy_type: 'Concealed Carry',
                        state: 'Texas',
                        year: 2021,
                        impact: -86.6,
                        significance: true,
                        category: 'permissive'
                    },
                    { 
                        id: 'florida_cc_2023',
                        name: 'Florida Constitutional Carry (2023)',
                        file: 'policy_impact_florida_concealed_carry_2023.json',
                        policy_type: 'Concealed Carry',
                        state: 'Florida',
                        year: 2023,
                        impact: -35.8,
                        significance: true,
                        category: 'permissive'
                    },
                    { 
                        id: 'georgia_cc_2022',
                        name: 'Georgia Constitutional Carry (2022)',
                        file: 'policy_impact_georgia_concealed_carry_2022.json',
                        policy_type: 'Concealed Carry',
                        state: 'Georgia',
                        year: 2022,
                        impact: 7.3,
                        significance: false,
                        category: 'permissive'
                    },
                    { 
                        id: 'arizona_cc_2010',
                        name: 'Arizona Constitutional Carry (2010)',
                        file: 'policy_impact_arizona_concealed_carry_2010.json',
                        policy_type: 'Concealed Carry',
                        state: 'Arizona',
                        year: 2010,
                        impact: -21.4,
                        significance: true,
                        category: 'permissive'
                    },
                    { 
                        id: 'ohio_cc_2022',
                        name: 'Ohio Constitutional Carry (2022)',
                        file: 'policy_impact_ohio_concealed_carry_2022.json',
                        policy_type: 'Concealed Carry',
                        state: 'Ohio',
                        year: 2022,
                        impact: -9.2,
                        significance: true,
                        category: 'permissive'
                    }
                ];
                */

            } catch (error) {
                console.error('❌ Error loading policy analyses:', error);
                console.error('Fetch error details:', error.message);

                // Fallback to empty array if loading fails
                window.policyAnalyses = [];
                setAvailableAnalyses([]);

                // Try to load the old index as fallback
                try {
                    console.log('🔄 Trying fallback to policy_analysis_index.json...');
                    const fallbackResponse = await fetch('/data/policy_analysis_index.json');
                    const fallbackData = await fallbackResponse.json();

                    if (fallbackData.analyses) {
                        const fallbackAnalyses = fallbackData.analyses.map(analysis => ({
                            ...analysis,
                            name: `${analysis.state} ${analysis.policy_type} (${analysis.year})`,
                            significance: analysis.significance === true || analysis.significance === 'True'
                        }));

                        window.policyAnalyses = fallbackAnalyses;
                        setAvailableAnalyses(fallbackAnalyses);
                        console.log(`✅ Loaded ${fallbackAnalyses.length} analyses from fallback`);
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback also failed:', fallbackError);
                }
            }
        };

        if (isVisible) {
            loadAvailableAnalyses();
        }
    }, [isVisible, selectedAnalysis]);

    // Available analyses list - dynamically loaded from index
    const [availableAnalyses, setAvailableAnalyses] = useState([]);

    // Update available analyses when data loads
    useEffect(() => {
        const checkForAnalyses = () => {
            if (window.policyAnalyses && window.policyAnalyses.length > 0) {
                console.log(`🔄 Setting ${window.policyAnalyses.length} analyses to state`);
                setAvailableAnalyses(window.policyAnalyses);
            } else {
                console.log('⏳ No analyses loaded yet, retrying...');
                // Retry after a short delay
                setTimeout(checkForAnalyses, 100);
            }
        };

        if (isVisible) {
            checkForAnalyses();
        }
    }, [isVisible]);

    // Filter and sort analyses
    const filteredAndSortedAnalyses = useMemo(() => {
        let filtered = availableAnalyses;

        // Filter by policy type
        if (filterPolicyType !== 'all') {
            filtered = filtered.filter(analysis =>
                analysis.policy_type && analysis.policy_type.toLowerCase().includes(filterPolicyType.toLowerCase())
            );
        }

        // Sort analyses
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'impact':
                    const aImpact = Math.abs(a.impact || 0);
                    const bImpact = Math.abs(b.impact || 0);
                    return bImpact - aImpact; // Highest impact first
                case 'state':
                    return (a.state || '').localeCompare(b.state || '');
                case 'year':
                    return (b.year || 0) - (a.year || 0); // Most recent first
                default:
                    return 0;
            }
        });

        return filtered;
    }, [filterPolicyType, sortBy]);

    // Load specific analysis data
    useEffect(() => {
        const loadAnalysisData = async () => {
            if (!selectedAnalysis) {
                console.log('⏳ No analysis selected');
                return;
            }

            try {
                setLoading(true);
                console.log(`📥 Loading analysis data for: ${selectedAnalysis.name}`);
                console.log(`📄 File path: /data/${selectedAnalysis.file}`);

                const response = await fetch(`/data/${selectedAnalysis.file}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(`✅ Successfully loaded data for ${selectedAnalysis.name}:`, data);

                // Validate data structure
                if (!data.time_series_data || !data.impact_summary) {
                    console.warn('⚠️ Data structure incomplete:', data);
                }

                setAnalysisData(data);
                setLoading(false);
            } catch (error) {
                console.error(`❌ Error loading analysis data for ${selectedAnalysis.name}:`, error);
                console.error('File path attempted:', `/data/${selectedAnalysis.file}`);
                console.error('Selected analysis object:', selectedAnalysis);
                setAnalysisData(null);
                setLoading(false);
            }
        };

        loadAnalysisData();
    }, [selectedAnalysis]);

    // Prepare timeline data for visualization
    const timelineData = useMemo(() => {
        if (!analysisData) {
            console.log('📊 No analysis data for timeline');
            return [];
        }

        console.log('📊 Preparing timeline data from:', analysisData);

        try {
            const beforeData = analysisData.time_series_data?.before_period?.map(item => ({
                ...item,
                period: 'Before',
                period_type: 'before'
            })) || [];

            const afterData = analysisData.time_series_data?.after_period?.map(item => ({
                ...item,
                period: 'After',
                period_type: 'after'
            })) || [];

            // Add implementation year marker
            const implementationMarker = {
                year: analysisData.policy_info?.implementation_year,
                incident_rate: null,
                period: 'Implementation',
                period_type: 'implementation'
            };

            const timelineResult = [...beforeData, implementationMarker, ...afterData].sort((a, b) => a.year - b.year);
            console.log('📈 Timeline data prepared:', timelineResult);

            return timelineResult;
        } catch (error) {
            console.error('❌ Error preparing timeline data:', error);
            console.error('Analysis data structure:', analysisData);
            return [];
        }
    }, [analysisData]);

    // Prepare comparison data
    const comparisonData = useMemo(() => {
        if (!analysisData || !analysisData.control_comparison) return [];

        return [
            {
                state: analysisData.policy_info.state,
                type: 'Treatment State',
                before_rate: analysisData.impact_summary.before_rate,
                after_rate: analysisData.impact_summary.after_rate,
                change_percent: analysisData.impact_summary.change_percent
            },
            ...analysisData.control_comparison.map(control => ({
                state: control.state,
                type: 'Control State',
                before_rate: control.before_rate,
                after_rate: control.after_rate,
                change_percent: control.change_percent
            }))
        ];
    }, [analysisData]);

    const formatChangePercent = (value) => {
        if (value === null || value === undefined) return 'N/A';
        if (!isFinite(value)) return 'N/A';
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    const getChangeColor = (value) => {
        if (value === null || value === undefined || !isFinite(value)) return '#666';
        return value > 0 ? '#dc3545' : '#28a745'; // Red for increase, green for decrease
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (data.period_type === 'implementation') {
                return (
                    <div className="policy-tooltip">
                        <p className="tooltip-label">{`Policy Implemented: ${label}`}</p>
                        <p className="tooltip-desc">
                            {analysisData.policy_info.policy_type} in {analysisData.policy_info.state}
                        </p>
                    </div>
                );
            }
            return (
                <div className="policy-tooltip">
                    <p className="tooltip-label">{`Year: ${label}`}</p>
                    <p className="tooltip-value">
                        {`Incident Rate: ${payload[0].value?.toFixed(2) || 'N/A'} per 100k`}
                    </p>
                    <p className="tooltip-period">{`Period: ${data.period}`}</p>
                </div>
            );
        }
        return null;
    };

    if (!isVisible) return null;

    return (
        <div className="policy-impact-overlay">
            <div className="policy-impact-container">
                {/* Header */}
                <div className="policy-impact-header">
                    <h2>Policy Impact Analysis</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {/* Filters and Search */}
                <div className="analysis-filters">
                    <div className="filter-section">
                        <label>Policy Type:</label>
                        <select
                            value={filterPolicyType}
                            onChange={(e) => setFilterPolicyType(e.target.value)}
                        >
                            <option value="all">All Policies ({availableAnalyses.length})</option>
                            <option value="background">Background Checks</option>
                            <option value="concealed">Concealed Carry</option>
                            <option value="prohibited">Prohibited Possessor</option>
                            <option value="firearm sales">Firearm Sales</option>
                            <option value="castle">Castle Doctrine</option>
                            <option value="child access">Child Access Laws</option>
                            <option value="waiting">Waiting Period</option>
                            <option value="minimum age">Minimum Age</option>
                            <option value="dealer">Dealer License</option>
                            <option value="untraceable">Untraceable Firearms</option>
                        </select>
                    </div>

                    <div className="filter-section">
                        <label>Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="impact">Highest Impact</option>
                            <option value="state">State (A-Z)</option>
                            <option value="year">Most Recent</option>
                        </select>
                    </div>
                </div>

                {/* Debug Info */}
                {availableAnalyses.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', margin: '20px', borderRadius: '8px' }}>
                        <p>🔍 <strong>Debug Info:</strong></p>
                        <p>Available analyses: {availableAnalyses.length}</p>
                        <p>Filtered analyses: {filteredAndSortedAnalyses.length}</p>
                        <p>Filter type: {filterPolicyType}</p>
                        <p>Loading state: {loading ? 'Loading...' : 'Loaded'}</p>
                        <p>Check browser console for detailed logs</p>
                    </div>
                )}

                {/* Analysis Cards Grid */}
                <div className="analysis-grid">
                    {filteredAndSortedAnalyses.length === 0 && availableAnalyses.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            <p>No policies match the current filter: "{filterPolicyType}"</p>
                            <p>Try selecting "All Policies" or a different filter.</p>
                        </div>
                    )}

                    {filteredAndSortedAnalyses.map((analysis) => (
                        <div
                            key={analysis.id}
                            className={`analysis-card ${selectedAnalysis?.id === analysis.id ? 'selected' : ''} ${analysis.category}`}
                            onClick={() => setSelectedAnalysis(analysis)}
                        >
                            <div className="card-header">
                                <div className="policy-type-badge">
                                    {analysis.policy_type || 'Unknown Policy'}
                                </div>
                                <div className={`impact-badge ${(analysis.impact || 0) < 0 ? 'positive' : 'negative'}`}>
                                    {(analysis.impact || 0) > 0 ? '+' : ''}{(analysis.impact || 0).toFixed(1)}%
                                </div>
                            </div>

                            <div className="card-content">
                                <h3>{analysis.state}</h3>
                                <p className="policy-description">{analysis.name}</p>
                                <div className="card-meta">
                                    <span className="year">{analysis.year}</span>
                                    {analysis.significance && (
                                        <span className="significance">✓ Significant</span>
                                    )}
                                </div>
                            </div>

                            <div className="impact-indicator">
                                <div className={`impact-bar ${(analysis.impact || 0) < 0 ? 'reduction' : 'increase'}`}>
                                    <div
                                        className="impact-fill"
                                        style={{ width: `${Math.min(Math.abs(analysis.impact || 0), 100)}%` }}
                                    ></div>
                                </div>
                                <span className="impact-label">
                                    {(analysis.impact || 0) < 0 ? 'Reduced Violence' : 'Increased Violence'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View Mode Selector */}
                <div className="view-mode-selector">
                    <button
                        className={viewMode === 'timeline' ? 'active' : ''}
                        onClick={() => setViewMode('timeline')}
                    >
                        Timeline View
                    </button>
                    <button
                        className={viewMode === 'comparison' ? 'active' : ''}
                        onClick={() => setViewMode('comparison')}
                    >
                        State Comparison
                    </button>
                    <button
                        className={viewMode === 'summary' ? 'active' : ''}
                        onClick={() => setViewMode('summary')}
                    >
                        Summary
                    </button>
                </div>

                {/* Content */}
                <div className="policy-impact-content">
                    {loading && (
                        <div className="loading-indicator">
                            <div className="loading-text">Loading analysis data...</div>
                        </div>
                    )}

                    {!loading && analysisData && (
                        <>
                            {/* Policy Info Header */}
                            <div className="policy-info-header">
                                <h3>
                                    {analysisData.policy_info.policy_type} - {analysisData.policy_info.state}
                                </h3>
                                <p>Implemented: {analysisData.policy_info.implementation_year}</p>
                            </div>

                            {/* Timeline View */}
                            {viewMode === 'timeline' && (
                                <div className="timeline-view">
                                    <h4>Gun Violence Rates Over Time</h4>
                                    {loading ? (
                                        <div className="loading-indicator">
                                            <p>Loading timeline data...</p>
                                        </div>
                                    ) : timelineData.length === 0 ? (
                                        <div className="no-data">
                                            <p>No timeline data available for this analysis.</p>
                                            <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '10px' }}>
                                                Check browser console for detailed error information.
                                            </p>
                                            {selectedAnalysis && (
                                                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '10px' }}>
                                                    Analysis: {selectedAnalysis.name}<br />
                                                    File: {selectedAnalysis.file}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="chart-container">
                                            <ResponsiveContainer width="100%" height={400}>
                                                <LineChart data={timelineData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="year"
                                                        domain={['dataMin', 'dataMax']}
                                                        tick={false}
                                                    />
                                                    <YAxis
                                                        label={{ value: 'Incidents per 100k', angle: -90, position: 'insideLeft' }}
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="incident_rate"
                                                        stroke="#2563eb"
                                                        strokeWidth={3}
                                                        dot={(props) => {
                                                            if (props.payload.period_type === 'implementation') {
                                                                return <circle cx={props.cx} cy={props.cy} r={6} fill="#dc3545" stroke="#dc3545" strokeWidth={2} />;
                                                            }
                                                            return <circle cx={props.cx} cy={props.cy} r={4} fill="#2563eb" />;
                                                        }}
                                                        connectNulls={false}
                                                        name="Incident Rate"
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Comparison View */}
                            {viewMode === 'comparison' && comparisonData.length > 0 && (
                                <div className="comparison-view">
                                    <h4>Treatment vs Control States</h4>
                                    <div className="chart-container">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={comparisonData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="state" />
                                                <YAxis label={{ value: 'Incidents per 100k', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="before_rate" fill="#94a3b8" name="Before Policy" />
                                                <Bar dataKey="after_rate" fill="#3b82f6" name="After Policy" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Summary View */}
                            {viewMode === 'summary' && (
                                <div className="summary-view">
                                    <div className="summary-cards">
                                        <div className="summary-card">
                                            <h4>Impact Summary</h4>
                                            <div className="impact-metric">
                                                <span className="metric-label">Before Rate:</span>
                                                <span className="metric-value">
                                                    {analysisData.impact_summary.before_rate.toFixed(2)} per 100k
                                                </span>
                                            </div>
                                            <div className="impact-metric">
                                                <span className="metric-label">After Rate:</span>
                                                <span className="metric-value">
                                                    {analysisData.impact_summary.after_rate.toFixed(2)} per 100k
                                                </span>
                                            </div>
                                            <div className="impact-metric">
                                                <span className="metric-label">Change:</span>
                                                <span
                                                    className="metric-value"
                                                    style={{ color: getChangeColor(analysisData.impact_summary.change_percent) }}
                                                >
                                                    {formatChangePercent(analysisData.impact_summary.change_percent)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="summary-card">
                                            <h4>Statistical Analysis</h4>
                                            <div className="impact-metric">
                                                <span className="metric-label">P-value:</span>
                                                <span className="metric-value">
                                                    {analysisData.impact_summary.p_value?.toFixed(6) || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="impact-metric">
                                                <span className="metric-label">Statistically Significant:</span>
                                                <span className={`metric-value ${analysisData.impact_summary.statistically_significant ? 'significant' : 'not-significant'}`}>
                                                    {analysisData.impact_summary.statistically_significant ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                            {analysisData.diff_in_diff && isFinite(analysisData.diff_in_diff) && (
                                                <div className="impact-metric">
                                                    <span className="metric-label">Diff-in-Diff:</span>
                                                    <span
                                                        className="metric-value"
                                                        style={{ color: getChangeColor(analysisData.diff_in_diff) }}
                                                    >
                                                        {formatChangePercent(analysisData.diff_in_diff)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {analysisData.control_comparison && (
                                            <div className="summary-card">
                                                <h4>Control States</h4>
                                                {analysisData.control_comparison.map((control, index) => (
                                                    <div key={index} className="control-state">
                                                        <strong>{control.state}:</strong>
                                                        <span style={{ color: getChangeColor(control.change_percent) }}>
                                                            {formatChangePercent(control.change_percent)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="interpretation">
                                        <h4>Interpretation</h4>
                                        <p>
                                            {analysisData.impact_summary.change_percent < 0
                                                ? `The ${analysisData.policy_info.policy_type} in ${analysisData.policy_info.state} was associated with a ${Math.abs(analysisData.impact_summary.change_percent).toFixed(1)}% decrease in gun violence incidents.`
                                                : analysisData.impact_summary.change_percent > 0
                                                    ? `The ${analysisData.policy_info.policy_type} in ${analysisData.policy_info.state} was associated with a ${analysisData.impact_summary.change_percent.toFixed(1)}% increase in gun violence incidents.`
                                                    : `The ${analysisData.policy_info.policy_type} in ${analysisData.policy_info.state} showed no significant change in gun violence incidents.`
                                            }
                                        </p>
                                        {analysisData.impact_summary.statistically_significant && (
                                            <p>
                                                This result is statistically significant (p &lt; 0.05), suggesting the observed change is unlikely due to random chance.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {!loading && !analysisData && (
                        <div className="no-data">
                            <p>Select an analysis to view policy impact data.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PolicyImpactVisualization;

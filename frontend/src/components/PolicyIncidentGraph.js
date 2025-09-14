import React, { useMemo } from 'react';
import './PolicyIncidentGraph.css';

const PolicyIncidentGraph = ({ state, policyDate, timelineData }) => {
    // Process data for the graph
    const graphData = useMemo(() => {
        if (!timelineData || !state || !policyDate) return [];

        // Filter data for the specific state
        const stateData = timelineData.filter(incident =>
            incident && incident.state === state && incident.year && !isNaN(incident.year)
        );

        // Group by year and count incidents
        const yearlyData = {};
        stateData.forEach(incident => {
            const year = parseInt(incident.year);
            if (!isNaN(year) && year >= 2019 && year <= 2025) {
                if (!yearlyData[year]) {
                    yearlyData[year] = 0;
                }
                yearlyData[year]++;
            }
        });

        // Convert to array and sort by year
        const sortedData = Object.entries(yearlyData)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .filter(item => !isNaN(item.year))
            .sort((a, b) => a.year - b.year);

        return sortedData;
    }, [timelineData, state]);

    const policyYear = useMemo(() => {
        if (!policyDate) return null;
        return new Date(policyDate).getFullYear();
    }, [policyDate]);

    // Calculate graph dimensions and scaling
    const maxCount = graphData.length > 0 ? Math.max(...graphData.map(d => d.count), 1) : 1;
    const minYear = graphData.length > 0 ? Math.min(...graphData.map(d => d.year)) : 2020;
    const maxYear = graphData.length > 0 ? Math.max(...graphData.map(d => d.year)) : 2025;
    const yearRange = Math.max(maxYear - minYear, 1);

    if (graphData.length === 0) {
        return (
            <div className="policy-graph-container">
                <h4>Incident Trends</h4>
                <div className="no-data">No incident data available for {state}</div>
            </div>
        );
    }

    return (
        <div className="policy-graph-container">
            <h4>Incident Trends in {state}</h4>
            <div className="graph-wrapper">
                <svg
                    className="incident-graph"
                    viewBox="0 0 400 120"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                        <line
                            key={i}
                            x1="40"
                            y1={20 + ratio * 80}
                            x2="380"
                            y2={20 + ratio * 80}
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Data line */}
                    <polyline
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        points={graphData.map((d, i) => {
                            const x = 40 + (i / Math.max(graphData.length - 1, 1)) * 340;
                            const y = 100 - (d.count / maxCount) * 80;
                            return `${isNaN(x) ? 40 : x},${isNaN(y) ? 100 : y}`;
                        }).join(' ')}
                    />

                    {/* Data points */}
                    {graphData.map((d, i) => {
                        const x = 40 + (i / Math.max(graphData.length - 1, 1)) * 340;
                        const y = 100 - (d.count / maxCount) * 80;
                        return (
                            <circle
                                key={i}
                                cx={isNaN(x) ? 40 : x}
                                cy={isNaN(y) ? 100 : y}
                                r="3"
                                fill="#ffffff"
                                className="data-point"
                            />
                        );
                    })}

                    {/* Policy enactment line */}
                    {policyYear && policyYear >= minYear && policyYear <= maxYear && (
                        <line
                            x1={40 + ((policyYear - minYear) / yearRange) * 340}
                            y1="20"
                            x2={40 + ((policyYear - minYear) / yearRange) * 340}
                            y2="100"
                            stroke="#ff6b35"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="policy-line"
                        />
                    )}


                    {/* Y-axis labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const value = Math.round(maxCount * (1 - ratio));
                        return (
                            <text
                                key={i}
                                x="35"
                                y={25 + ratio * 80}
                                textAnchor="end"
                                className="count-label"
                                fill="#cccccc"
                                fontSize="10"
                            >
                                {value}
                            </text>
                        );
                    })}
                </svg>
            </div>
            <div className="graph-legend">
                <div className="legend-item">
                    <div className="legend-line white"></div>
                    <span>Incidents</span>
                </div>
                {policyYear && (
                    <div className="legend-item">
                        <div className="legend-line gold"></div>
                        <span>Policy Enacted ({policyYear})</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolicyIncidentGraph;

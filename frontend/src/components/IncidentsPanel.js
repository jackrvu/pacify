import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import './IncidentsPanel.css';

function IncidentsPanel({ cursorPosition, incidents, onMapClick, isMobile, onPanelStateChange, selectedState, hidePolicySection = false }) {
    const [nearbyIncidents, setNearbyIncidents] = useState([]);
    const [displayedIncidentCount, setDisplayedIncidentCount] = useState(20);
    const [loadingMoreIncidents, setLoadingMoreIncidents] = useState(false);
    const [persistentIncidents, setPersistentIncidents] = useState([]);
    const [isPersistent, setIsPersistent] = useState(false);
    const [lastClickCount, setLastClickCount] = useState(0);
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);
    
    // Resize state
    const [panelWidth, setPanelWidth] = useState(320); // Half the original size
    const [isResizing, setIsResizing] = useState(false);

    // Policy-related state
    const [policyData, setPolicyData] = useState([]);
    const [loadingPolicy, setLoadingPolicy] = useState(false);
    const [policyError, setPolicyError] = useState(null);

    const incidentsListRef = useRef(null);
    const incidentsContentRef = useRef(null);
    const panelRef = useRef(null);

    // Function to calculate distance between two points
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Load policy data when component mounts
    useEffect(() => {
        const loadPolicyData = async () => {
            try {
                setLoadingPolicy(true);
                setPolicyError(null);

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
                        setPolicyError('Failed to load policy data');
                        setLoadingPolicy(false);
                    }
                });
            } catch (error) {
                console.error('Error loading policy data:', error);
                setPolicyError('Failed to load policy data');
                setLoadingPolicy(false);
            }
        };

        loadPolicyData();
    }, []);

    // Filter policies for the selected state and get the most recent ones
    const getRecentPoliciesForState = (stateName) => {
        if (!policyData || !stateName) return [];

        const statePolicies = policyData.filter(policy =>
            policy.State && policy.State.toLowerCase() === stateName.toLowerCase()
        );

        // Sort by effective date (most recent first)
        const sortedPolicies = statePolicies.sort((a, b) => {
            const yearA = parseInt(a['Effective Date Year']) || 0;
            const monthA = parseInt(a['Effective Date Month']) || 0;
            const dayA = parseInt(a['Effective Date Day']) || 0;

            const yearB = parseInt(b['Effective Date Year']) || 0;
            const monthB = parseInt(b['Effective Date Month']) || 0;
            const dayB = parseInt(b['Effective Date Day']) || 0;

            // Compare years first
            if (yearA !== yearB) return yearB - yearA;
            // Then months
            if (monthA !== monthB) return monthB - monthA;
            // Then days
            return dayB - dayA;
        });

        // Return the 5 most recent policies (fewer for side panel)
        return sortedPolicies.slice(0, 5);
    };

    const formatPolicyDate = (year, month, day) => {
        if (!year) return 'Unknown Date';

        const date = new Date(year, (month || 1) - 1, day || 1);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

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

    // Effect to handle incidents based on cursor position
    useEffect(() => {
        if (!cursorPosition || !incidents || incidents.length === 0) {
            if (!isPersistent) {
                setNearbyIncidents([]);
                setDisplayedIncidentCount(20);
            }
            return;
        }

        // If we have persistent incidents, don't update based on cursor movement
        if (isPersistent) {
            return;
        }

        const { lat, lng, zoom } = cursorPosition;

        // Convert incident data to points with proper filtering
        const points = incidents
            .map(incident => ({
                lat: parseFloat(incident.Latitude),
                lng: parseFloat(incident.Longitude),
                data: incident
            }))
            .filter(point => !isNaN(point.lat) && !isNaN(point.lng));

        // Use zoom-aware search radius that decreases significantly as user zooms in
        let searchRadius;
        if (zoom >= 12) {
            searchRadius = 0.05; // Very precise at highest zoom
        } else if (zoom >= 10) {
            searchRadius = 0.1; // Precise at high zoom
        } else if (zoom >= 8) {
            searchRadius = 0.25; // Medium precision
        } else if (zoom >= 6) {
            searchRadius = 0.5; // Less precise at medium zoom
        } else if (zoom >= 4) {
            searchRadius = 1.0; // Generous at low-medium zoom
        } else {
            searchRadius = 2.0; // Very generous at low zoom
        }

        const nearby = points.filter(point => {
            const distance = Math.sqrt(
                Math.pow(lat - point.lat, 2) +
                Math.pow(lng - point.lng, 2)
            );
            return distance <= searchRadius;
        }).map(point => ({
            ...point.data,
            distance: calculateDistance(lat, lng, point.lat, point.lng)
        }));

        // Remove duplicates based on Incident ID
        const uniqueIncidents = nearby.filter((incident, index, self) =>
            index === self.findIndex(i => i['Incident ID'] === incident['Incident ID'])
        );

        // Sort by distance and limit to 100 closest incidents
        const sortedIncidents = uniqueIncidents
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 100);

        setNearbyIncidents(sortedIncidents);
        setDisplayedIncidentCount(20);
    }, [cursorPosition, incidents, isPersistent]);

    // Effect to handle map clicks - toggle persistent mode
    useEffect(() => {
        if (onMapClick > lastClickCount && !isPanelMinimized) {
            if (nearbyIncidents.length > 0) {
                if (!isPersistent) {
                    // First click - pause the current incidents
                    setPersistentIncidents([...nearbyIncidents]);
                    setIsPersistent(true);
                    // Reset scroll position when switching via map click
                    setTimeout(() => {
                        if (incidentsContentRef.current) {
                            incidentsContentRef.current.scrollTop = 0;
                        }
                    }, 0);
                } else {
                    // Second click - unpause and clear
                    setPersistentIncidents([]);
                    setIsPersistent(false);
                }
            }
        }
        setLastClickCount(onMapClick);
    }, [onMapClick, nearbyIncidents, isPersistent, lastClickCount, isPanelMinimized]);

    const minimizePanel = () => {
        setIsPanelMinimized(true);
    };

    const restorePanel = () => {
        setIsPanelMinimized(false);
    };

    // Resize handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const newWidth = window.innerWidth - e.clientX;
        const minWidth = 300;
        const maxWidth = window.innerWidth * 0.8;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            setPanelWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    // Add event listeners for resize
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    // Use persistent incidents if available, otherwise use nearby incidents
    const currentIncidents = isPersistent ? persistentIncidents : nearbyIncidents;
    const displayedIncidents = currentIncidents.slice(0, displayedIncidentCount);

    const clearPersistentIncidents = () => {
        setPersistentIncidents([]);
        setIsPersistent(false);
        setNearbyIncidents([]);
        setDisplayedIncidentCount(20);
    };

    const loadMoreIncidents = async () => {
        if (loadingMoreIncidents || displayedIncidentCount >= currentIncidents.length) return;

        setLoadingMoreIncidents(true);
        await new Promise(resolve => setTimeout(resolve, 300));

        const nextBatch = currentIncidents.slice(displayedIncidentCount, displayedIncidentCount + 20);
        setDisplayedIncidentCount(prev => prev + 20);
        setLoadingMoreIncidents(false);
    };

    const handleIncidentsScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const scrollableHeight = scrollHeight - clientHeight;
        const threshold = scrollableHeight * 0.1;

        if (scrollHeight - scrollTop <= clientHeight + threshold) {
            loadMoreIncidents();
        }
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return null;
            }
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return null;
        }
    };

    const getSeverityColor = (killed, injured) => {
        const total = killed + injured;
        if (total >= 10) return '#8B0000'; // Dark red
        if (total >= 5) return '#DC143C'; // Crimson
        if (total >= 3) return '#FF4500'; // Orange red
        if (total >= 1) return '#FF8C00'; // Dark orange
        return '#FFD700'; // Gold
    };

    // Notify parent when panel state changes
    useEffect(() => {
        if (onPanelStateChange) {
            onPanelStateChange(isPanelMinimized);
        }
    }, [isPanelMinimized, onPanelStateChange]);

    return (
        <>
            {/* Restore button for mobile when panel is minimized */}
            {isMobile && isPanelMinimized && (
                <button
                    className="mobile-restore-button"
                    onClick={restorePanel}
                    aria-label="Restore panel"
                >
                    <span className="restore-icon">▲</span>
                </button>
            )}

            <div
                className={`incidents-panel ${isMobile ? 'mobile' : ''} ${isMobile && isPanelMinimized ? 'minimized' : ''} ${isResizing ? 'resizing' : ''}`}
                ref={panelRef}
                style={{ width: isMobile ? '100%' : `${panelWidth}px` }}
            >
                {/* Resize handle */}
                {!isMobile && (
                    <div 
                        className="resize-handle"
                        onMouseDown={handleMouseDown}
                    />
                )}
                <div className="incidents-panel-header">
                    {/* Minimize button for mobile */}
                    {isMobile && !isPanelMinimized && (
                        <button
                            className="mobile-minimize-button"
                            onClick={minimizePanel}
                            aria-label="Minimize panel"
                        >
                            <span className="minimize-icon">▼</span>
                        </button>
                    )}

                    {!isMobile && (
                        <div className="paused-indicator">
                            {isPersistent ? 'Click to Unpause' : 'Click to Pause'}
                        </div>
                    )}

                    <div className="header-top">
                        <h3>Gun Violence Incidents</h3>
                        {isPersistent && (
                            <button
                                className="clear-button"
                                onClick={clearPersistentIncidents}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="incidents-panel-content">
                    {/* Incidents Section */}
                    <div className="incidents-section">
                        <div className="incidents-content" ref={incidentsContentRef} onScroll={handleIncidentsScroll}>
                            {currentIncidents.length === 0 ? (
                                <div className="incidents-placeholder">
                                    <h4>No Nearby Incidents</h4>
                                    <p className="placeholder-text">
                                        {isMobile ? 'Tap to see nearby incidents' : 'Move your cursor over the map to see nearby incidents.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="incidents-list" ref={incidentsListRef}>
                                    <div className="incidents-header">
                                        <h4>
                                            {isPersistent ? 'Incidents ' : 'Incidents in Range '}
                                            ({currentIncidents.length})
                                        </h4>
                                    </div>
                                    {displayedIncidents.map((incident, index) => (
                                        <div key={index} className="incident-item">
                                            <div className="incident-header">
                                                {formatDate(incident['Incident Date']) && (
                                                    <span className="incident-date">{formatDate(incident['Incident Date'])}</span>
                                                )}
                                                <div
                                                    className="severity-badge"
                                                    style={{
                                                        backgroundColor: getSeverityColor(
                                                            parseInt(incident['Victims Killed'] || 0),
                                                            parseInt(incident['Victims Injured'] || 0)
                                                        )
                                                    }}
                                                >
                                                    {incident['Victims Killed'] || 0}K / {incident['Victims Injured'] || 0}I
                                                </div>
                                            </div>
                                            <div className="incident-title">
                                                {incident['City Or County']}, {incident.State}
                                            </div>
                                            <div className="incident-address">
                                                {incident.Address}
                                            </div>
                                            {incident.distance && (
                                                <div className="incident-distance">
                                                    {incident.distance.toFixed(2)} km away
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {loadingMoreIncidents && (
                                        <div className="loading-more">Loading more incidents...</div>
                                    )}
                                    {displayedIncidentCount >= currentIncidents.length && currentIncidents.length > 0 && (
                                        <div className="no-more-incidents">No more incidents to load</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Policy Section - Hidden when timeline popup is active */}
                    {selectedState && !hidePolicySection && (
                        <div className="policy-section">
                            <div className="policy-section-header">
                                <h4>Recent Policy Changes in {selectedState}</h4>
                                <p className="policy-hint">Enable Timeline View to see all policy changes</p>
                            </div>
                            <div className="policy-content">
                                {loadingPolicy && (
                                    <div className="policy-loading">
                                        <p>Loading policy data...</p>
                                    </div>
                                )}

                                {policyError && (
                                    <div className="policy-error">
                                        <p>{policyError}</p>
                                    </div>
                                )}

                                {!loadingPolicy && !policyError && (
                                    (() => {
                                        const recentPolicies = getRecentPoliciesForState(selectedState);
                                        return recentPolicies.length === 0 ? (
                                            <div className="no-policies">
                                                <p>No recent policy changes in {selectedState}</p>
                                            </div>
                                        ) : (
                                            <div className="policies-list">
                                                {recentPolicies.map((policy, index) => (
                                                    <div key={policy['Law ID'] || index} className="policy-item">
                                                        <div className="policy-header">
                                                            <div className="policy-date">
                                                                {formatPolicyDate(
                                                                    policy['Effective Date Year'],
                                                                    policy['Effective Date Month'],
                                                                    policy['Effective Date Day']
                                                                )}
                                                            </div>
                                                            <div
                                                                className="policy-effect"
                                                                style={{ color: getPolicyEffectColor(policy.Effect) }}
                                                            >
                                                                {policy.Effect || 'Unknown'}
                                                            </div>
                                                        </div>

                                                        <div className="policy-title">
                                                            {policy['Law Class'] || 'Unknown Law Class'}
                                                        </div>

                                                        <div className="policy-change-type">
                                                            <strong>Change:</strong> {policy['Type of Change'] || 'Unknown'}
                                                        </div>

                                                        {policy.Content && (
                                                            <div className="policy-content-text">
                                                                {policy.Content.length > 100
                                                                    ? `${policy.Content.substring(0, 100)}...`
                                                                    : policy.Content}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default IncidentsPanel;

// IncidentsPanel component - displays nearby incidents based on cursor position
// Shows detailed incident information in a resizable sidebar panel
// Supports both dynamic cursor-based updates and persistent incident display
import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import './IncidentsPanel.css';

function IncidentsPanel({ cursorPosition, incidents, onMapClick, isMobile, onPanelStateChange, isVisible = false }) {
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

    // Don't render if not visible
    if (!isVisible) {
        return null;
    }

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
                                                {incident.County_Name ?
                                                    `${incident.County_Name}, ${incident.State}` :
                                                    incident['City Or County'] ?
                                                        `${incident['City Or County']}, ${incident.State}` :
                                                        incident.State
                                                }
                                            </div>
                                            {incident.County_Name && incident['City Or County'] && incident.County_Name !== incident['City Or County'] && (
                                                <div className="incident-county-info" style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>
                                                    City: {incident['City Or County']}
                                                </div>
                                            )}
                                            <div className="incident-address">
                                                {incident.Coordinate_Display ? (
                                                    incident.Google_Maps_Link ? (
                                                        <a
                                                            href={incident.Google_Maps_Link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#007bff', textDecoration: 'underline' }}
                                                        >
                                                            {incident.Coordinate_Display}
                                                        </a>
                                                    ) : (
                                                        incident.Coordinate_Display
                                                    )
                                                ) : (
                                                    <span style={{ color: '#666' }}>Coordinates not available</span>
                                                )}
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

                </div>
            </div>
        </>
    );
}

export default IncidentsPanel;

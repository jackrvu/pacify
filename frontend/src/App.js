// Main App component for Pacify - Gun Violence Data Visualization
// Uses Leaflet for mapping with county choropleth and incident heatmap layers

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Papa from 'papaparse';
import MapLayer from './components/MapLayer';
import Controls from './components/Controls';
import IncidentPins from './components/IncidentPins';
import IncidentHeatmap from './components/IncidentHeatmap';
import Violence3DGlobe from './components/Violence3DGlobe';
import CursorTracker from './components/CursorTracker';
import IncidentsPanel from './components/IncidentsPanel';
import IncidentSummary from './components/IncidentSummary';
import TimelineControls from './components/TimelineControls';
import PolicyTimelinePopup from './components/PolicyTimelinePopup';
import useTimelineData from './hooks/useTimelineData';
import './App.css';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet - required for proper icon display
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function App() {
    // State for controlling map layer visibility
    const [showCountyLayer, setShowCountyLayer] = useState(true);
    const [showHeatMapLayer, setShowHeatMapLayer] = useState(true);
    const [showPinsLayer, setShowPinsLayer] = useState(false); // Disable pins by default

    // State for 3D view toggle
    const [show3DView, setShow3DView] = useState(false);

    // Timeline state
    const [timelineMode, setTimelineMode] = useState(true); // Start in timeline mode to get full dataset
    const [currentYear, setCurrentYear] = useState(2019);

    // Legacy state for backward compatibility
    const [incidents, setIncidents] = useState([]); // Gun violence incident data
    const [loading, setLoading] = useState(true);

    // Timeline data hook
    const {
        allData: timelineData,
        loading: timelineLoading,
        availableYears,
        getDataForYear,
        getYearStats
    } = useTimelineData();

    // State for cursor tracking and panel
    const [cursorPosition, setCursorPosition] = useState(null);
    const [mapClickCount, setMapClickCount] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);

    // State for policy tab
    const [selectedState, setSelectedState] = useState(null);

    // State for policy timeline popup
    const [showPolicyTimeline, setShowPolicyTimeline] = useState(false);



    // Detect mobile device on mount and window resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        // Check on mount
        checkMobile();

        // Listen for window resize
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Update incidents based on timeline mode and current year
    useEffect(() => {
        if (timelineLoading) {
            setLoading(true);
            return;
        }

        if (timelineData.length > 0) {
            // Always use timeline data for consistency
            const yearData = getDataForYear(currentYear);
            // Convert timeline data format to legacy format for compatibility
            const legacyFormat = yearData.map(item => ({
                'Incident ID': item.id,
                'Incident Date': `${item.month || 1}/1/${item.year}`,
                'State': item.state,
                'City Or County': item.city || '',
                'Address': item.address || '',
                'Coordinate_Display': item.address || '',
                'Google_Maps_Link': item.googleMapsLink || '',
                'Victims Killed': item.killed,
                'Victims Injured': item.injured,
                'Latitude': item.latitude,
                'Longitude': item.longitude,
                'County_Name': item.county || '',
                'County_State': item.countyState || '',
                ...item.originalData
            }));
            setIncidents(legacyFormat);
        }

        setLoading(timelineLoading);
    }, [currentYear, timelineData.length, timelineLoading, getDataForYear]);

    // Show policy timeline when a state is selected
    useEffect(() => {
        if (selectedState) {
            setShowPolicyTimeline(true);
        }
    }, [selectedState]);


    // Cursor and panel handlers
    const handleCursorMove = (position) => {
        setCursorPosition(position);
    };

    const handleMapClick = () => {
        setMapClickCount(prev => prev + 1);

        // Detect state based on cursor position and incidents
        if (cursorPosition && incidents.length > 0) {
            const state = detectStateFromPosition(cursorPosition);
            if (state && state !== selectedState) {
                setSelectedState(state);
                // Always show policy timeline when a state is selected
                setShowPolicyTimeline(true);
            }
        }
    };

    // Function to detect state from cursor position by finding nearby incidents
    const detectStateFromPosition = (position) => {
        if (!position || !incidents.length) return null;

        const { lat, lng } = position;
        const searchRadius = 1.0; // Increased radius for state detection

        // Find incidents near the clicked position
        const nearbyIncidents = incidents.filter(incident => {
            const incidentLat = parseFloat(incident.Latitude);
            const incidentLng = parseFloat(incident.Longitude);

            if (isNaN(incidentLat) || isNaN(incidentLng)) return false;

            const distance = Math.sqrt(
                Math.pow(lat - incidentLat, 2) +
                Math.pow(lng - incidentLng, 2)
            );

            return distance <= searchRadius;
        });

        // Return the most common state among nearby incidents
        if (nearbyIncidents.length > 0) {
            const stateCounts = {};
            nearbyIncidents.forEach(incident => {
                const state = incident.State;
                if (state) {
                    stateCounts[state] = (stateCounts[state] || 0) + 1;
                }
            });

            // Find the state with the most incidents
            let mostCommonState = null;
            let maxCount = 0;
            Object.entries(stateCounts).forEach(([state, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    mostCommonState = state;
                }
            });

            return mostCommonState;
        }

        return null;
    };


    // Timeline handlers
    const handleTimelineToggle = (enabled) => {
        setTimelineMode(enabled);
        if (enabled && availableYears.length > 0) {
            // Set to earliest year when enabling timeline
            setCurrentYear(Math.min(...availableYears));
        }
        // Note: Policy timeline visibility is now controlled by selectedState, not timeline mode
    };

    const handleYearChange = (year) => {
        setCurrentYear(year);
    };

    // 3D view toggle handler
    const handleToggle3DView = (enabled) => {
        setShow3DView(enabled);
    };

    // Policy timeline handlers
    const handleClosePolicyTimeline = () => {
        setShowPolicyTimeline(false);
        setSelectedState(null); // Clear selected state when closing timeline
        // Note: Timeline mode can remain enabled independently of policy timeline
    };

    const handlePolicyClick = (year, policies) => {
        // Policy click is now handled within the PolicyTimelinePopup component modal
        // This handler is kept for backward compatibility but is no longer needed
    };


    // Show loading screen while CSV data loads
    if (loading) {
        return (
            <div className="loading-screen">
                <h1>Pacify</h1>
                <p>Loading incident data...</p>
                <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#666' }}>
                    Tip: Click on any state to view recent policy changes
                </p>
            </div>
        );
    }

    return (
        <div className="App">
            <div className="map-container">
                {/* Conditional rendering: 3D globe or 2D map */}
                {show3DView ? (
                    <Violence3DGlobe
                        incidents={incidents}
                        enabled={show3DView}
                    />
                ) : (
                    <MapContainer
                        center={[39.8283, -98.5795]} // Geographic center of US
                        zoom={4}
                        style={{ height: '100vh', width: '100vw' }}
                        zoomControl={true}
                        attributionControl={true}
                    >
                        {/* Base map tiles - Grim Hospital Gray Theme */}
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            className="grim-hospital-map"
                        />

                        {/* County choropleth layer - shows data density by county */}
                        {showCountyLayer && (
                            <MapLayer enabled={showCountyLayer} />
                        )}

                        {/* Heatmap layer - shows incident clustering */}
                        {showHeatMapLayer && (
                            <IncidentHeatmap incidents={incidents} enabled={showHeatMapLayer} />
                        )}

                        {/* Pins layer - shows individual incident markers */}
                        {showPinsLayer && (
                            <IncidentPins incidents={incidents} />
                        )}

                        {/* Cursor tracking for incidents panel */}
                        <CursorTracker
                            onCursorMove={handleCursorMove}
                            onMapClick={handleMapClick}
                        />
                    </MapContainer>
                )}

                {/* Floating controls for layer toggles */}
                <div className="controls-overlay">
                    <Controls
                        onToggleTimeline={handleTimelineToggle}
                        timelineMode={timelineMode}
                        currentYear={currentYear}
                        availableYears={availableYears}
                        onToggle3DView={handleToggle3DView}
                        show3DView={show3DView}
                    />


                    {/* Current View Indicator */}
                    <div className="current-view-indicator">
                        <div className="view-indicator-icon">
                            {show3DView ? '🌍' : '🔥'}
                        </div>
                        <div className="view-indicator-text">
                            {show3DView ? '3D Globe View' : 'Heatmap View'}
                        </div>
                    </div>

                </div>
            </div>

            {/* Compact incident summary */}
            <IncidentSummary
                incidents={incidents}
                currentYear={currentYear}
                selectedState={selectedState}
                cursorPosition={cursorPosition}
                onMapClick={mapClickCount}
                isMobile={isMobile}
            />

            {/* Policy Timeline Popup */}
            <PolicyTimelinePopup
                isVisible={showPolicyTimeline}
                onClose={handleClosePolicyTimeline}
                availableYears={availableYears}
                currentYear={currentYear}
                onYearChange={handleYearChange}
                onPolicyClick={handlePolicyClick}
                selectedState={selectedState}
            />


        </div>
    );
}

export default App;
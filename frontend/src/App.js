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
import CursorTracker from './components/CursorTracker';
import IncidentsPanel from './components/IncidentsPanel';
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

    // Timeline state
    const [timelineMode, setTimelineMode] = useState(false);
    const [currentYear, setCurrentYear] = useState(2025);

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

        if (timelineMode && timelineData.length > 0) {
            // Timeline mode: use filtered data
            const yearData = getDataForYear(currentYear);
            // Convert timeline data format to legacy format for compatibility
            const legacyFormat = yearData.map(item => ({
                'Incident ID': item.id,
                'Incident Date': `${item.month || 1}/1/${item.year}`,
                'State': item.state,
                'City Or County': item.city || '',
                'Address': item.address || '',
                'Victims Killed': item.killed,
                'Victims Injured': item.injured,
                'Latitude': item.latitude,
                'Longitude': item.longitude,
                ...item.originalData
            }));
            setIncidents(legacyFormat);
        } else if (!timelineMode) {
            // Legacy mode: load 2025 data as before
            const load2025Data = async () => {
                try {
                    const response = await fetch('/data/2025_with_locations.csv');
                    const csvText = await response.text();

                    Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            setIncidents(results.data);
                        },
                        error: (error) => {
                            console.error('Error parsing CSV:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error loading incident data:', error);
                }
            };

            load2025Data();
        }

        setLoading(timelineLoading);
    }, [timelineMode, currentYear, timelineData.length, timelineLoading, getDataForYear]);

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

    // Policy timeline handlers
    const handleClosePolicyTimeline = () => {
        setShowPolicyTimeline(false);
        setSelectedState(null); // Clear selected state when closing timeline
        // Note: Timeline mode can remain enabled independently of policy timeline
    };

    const handlePolicyClick = (year, policies) => {
        // Policy click is handled within the PolicyTimelinePopup component
        // No need for separate modal
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
                <MapContainer
                    center={[39.8283, -98.5795]} // Geographic center of US
                    zoom={4}
                    style={{ height: '100vh', width: '100vw' }}
                    zoomControl={true}
                    attributionControl={true}
                >
                    {/* Base map tiles from OpenStreetMap */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

                {/* Floating controls for layer toggles */}
                <div className="controls-overlay">
                    <Controls
                        onToggleTimeline={handleTimelineToggle}
                        timelineMode={timelineMode}
                        currentYear={currentYear}
                        availableYears={availableYears}
                    />

                </div>
            </div>

            {/* Incidents panel */}
            <IncidentsPanel
                cursorPosition={cursorPosition}
                incidents={incidents}
                onMapClick={mapClickCount}
                isMobile={isMobile}
                onPanelStateChange={setIsPanelMinimized}
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
// Main App component for Pacify - Gun Violence Data Visualization
// Uses Leaflet for mapping with county choropleth and incident heatmap layers

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import StateGunViolencePanel from './components/StateGunViolencePanel';
import HeatmapLegend from './components/HeatmapLegend';
import ResizableTab from './components/ResizableTab';
import AboutPage from './components/AboutPage';
import MethodologyPage from './components/MethodologyPage';
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

// Main map component - extracted for routing
function MapApp() {
    // Map reference for fly-to functionality
    const mapRef = useRef(null);

    // State for controlling map layer visibility
    const [showCountyLayer, setShowCountyLayer] = useState(true);
    const [showHeatMapLayer, setShowHeatMapLayer] = useState(true);
    const [showPinsLayer, setShowPinsLayer] = useState(false); // Disable pins by default


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

    // State for analytics dashboard
    const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
    const [selectedPolicyForDashboard, setSelectedPolicyForDashboard] = useState(null);

    // State for gun violence context panel
    const [stateContextData, setStateContextData] = useState([]);
    const [hoveredState, setHoveredState] = useState(null);
    const [showStateContextPanel, setShowStateContextPanel] = useState(false);
    const [panelKey, setPanelKey] = useState(0); // Key to force panel recreation




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

    // Load state context data
    useEffect(() => {
        const loadStateContextData = async () => {
            try {
                const response = await fetch('/data/state_context_progress.json');
                if (response.ok) {
                    const data = await response.json();
                    setStateContextData(data.results || []);
                    console.log(`Loaded state context data for ${data.results?.length || 0} states`);
                } else {
                    console.warn('Could not load state context data:', response.status);
                }
            } catch (error) {
                console.error('Error loading state context data:', error);
            }
        };

        loadStateContextData();
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

        // Detect state on hover for context panel
        if (position && incidents.length > 0) {
            const state = detectStateFromPosition(position);
            if (state && state !== hoveredState) {
                // Update hovered state immediately
                setHoveredState(state);

                // Show panel instantly
                setShowStateContextPanel(true);
            }
        }
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

    // Function to detect state from cursor position using geographic boundaries
    const detectStateFromPosition = (position) => {
        if (!position) return null;

        const { lat, lng } = position;

        // First try to find nearby incidents for accurate state detection
        if (incidents.length > 0) {
            const searchRadius = 2.0; // Larger radius for better coverage

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
        }

        // Fallback: Use geographic boundaries for state detection
        // This is a simplified geographic state detection based on lat/lng ranges
        return getStateFromCoordinates(lat, lng);
    };

    // Helper function to determine state from coordinates using geographic boundaries
    const getStateFromCoordinates = (lat, lng) => {
        // US state boundary approximations (simplified ranges)
        const stateBoundaries = {
            'Alaska': { minLat: 51, maxLat: 71, minLng: -180, maxLng: -130 },
            'Hawaii': { minLat: 18, maxLat: 22, minLng: -162, maxLng: -154 },
            'California': { minLat: 32, maxLat: 42, minLng: -124, maxLng: -114 },
            'Texas': { minLat: 25, maxLat: 36, minLng: -106, maxLng: -93 },
            'Florida': { minLat: 24, maxLat: 31, minLng: -87, maxLng: -80 },
            'New York': { minLat: 40, maxLat: 45, minLng: -79, maxLng: -71 },
            'Illinois': { minLat: 36, maxLat: 42, minLng: -91, maxLng: -87 },
            'Pennsylvania': { minLat: 39, maxLat: 42, minLng: -80, maxLng: -74 },
            'Ohio': { minLat: 38, maxLat: 42, minLng: -84, maxLng: -80 },
            'Georgia': { minLat: 30, maxLat: 35, minLng: -85, maxLng: -80 },
            'North Carolina': { minLat: 33, maxLat: 36, minLng: -84, maxLng: -75 },
            'Michigan': { minLat: 41, maxLat: 48, minLng: -90, maxLng: -82 },
            'New Jersey': { minLat: 38, maxLat: 41, minLng: -75, maxLng: -73 },
            'Virginia': { minLat: 36, maxLat: 39, minLng: -83, maxLng: -75 },
            'Washington': { minLat: 45, maxLat: 49, minLng: -124, maxLng: -116 },
            'Arizona': { minLat: 31, maxLat: 37, minLng: -114, maxLng: -109 },
            'Massachusetts': { minLat: 41, maxLat: 43, minLng: -73, maxLng: -69 },
            'Tennessee': { minLat: 34, maxLat: 36, minLng: -90, maxLng: -81 },
            'Indiana': { minLat: 37, maxLat: 42, minLng: -88, maxLng: -84 },
            'Missouri': { minLat: 35, maxLat: 40, minLng: -95, maxLng: -89 },
            'Maryland': { minLat: 37, maxLat: 40, minLng: -79, maxLng: -75 },
            'Wisconsin': { minLat: 42, maxLat: 47, minLng: -92, maxLng: -86 },
            'Colorado': { minLat: 36, maxLat: 41, minLng: -109, maxLng: -102 },
            'Minnesota': { minLat: 43, maxLat: 49, minLng: -97, maxLng: -89 },
            'South Carolina': { minLat: 32, maxLat: 35, minLng: -83, maxLng: -78 },
            'Alabama': { minLat: 30, maxLat: 35, minLng: -88, maxLng: -84 },
            'Louisiana': { minLat: 28, maxLat: 33, minLng: -94, maxLng: -88 },
            'Kentucky': { minLat: 36, maxLat: 39, minLng: -89, maxLng: -81 },
            'Oregon': { minLat: 41, maxLat: 46, minLng: -124, maxLng: -116 },
            'Oklahoma': { minLat: 33, maxLat: 37, minLng: -103, maxLng: -94 },
            'Connecticut': { minLat: 40, maxLat: 42, minLng: -73, maxLng: -71 },
            'Utah': { minLat: 36, maxLat: 42, minLng: -114, maxLng: -109 },
            'Iowa': { minLat: 40, maxLat: 43, minLng: -96, maxLng: -90 },
            'Nevada': { minLat: 35, maxLat: 42, minLng: -120, maxLng: -114 },
            'Arkansas': { minLat: 33, maxLat: 36, minLng: -94, maxLng: -89 },
            'Mississippi': { minLat: 30, maxLat: 35, minLng: -91, maxLng: -88 },
            'Kansas': { minLat: 37, maxLat: 40, minLng: -102, maxLng: -94 },
            'New Mexico': { minLat: 31, maxLat: 37, minLng: -109, maxLng: -103 },
            'Nebraska': { minLat: 40, maxLat: 43, minLng: -104, maxLng: -95 },
            'West Virginia': { minLat: 37, maxLat: 40, minLng: -82, maxLng: -77 },
            'Idaho': { minLat: 41, maxLat: 49, minLng: -117, maxLng: -111 },
            'Hawaii': { minLat: 18, maxLat: 22, minLng: -162, maxLng: -154 },
            'New Hampshire': { minLat: 42, maxLat: 45, minLng: -72, maxLng: -70 },
            'Maine': { minLat: 43, maxLat: 47, minLng: -71, maxLng: -66 },
            'Montana': { minLat: 44, maxLat: 49, minLng: -116, maxLng: -104 },
            'Rhode Island': { minLat: 41, maxLat: 42, minLng: -71, maxLng: -71 },
            'Delaware': { minLat: 38, maxLat: 40, minLng: -75, maxLng: -75 },
            'South Dakota': { minLat: 42, maxLat: 46, minLng: -104, maxLng: -96 },
            'North Dakota': { minLat: 45, maxLat: 49, minLng: -104, maxLng: -96 },
            'Vermont': { minLat: 42, maxLat: 45, minLng: -73, maxLng: -71 },
            'Wyoming': { minLat: 40, maxLat: 45, minLng: -111, maxLng: -104 }
        };

        // Check which state the coordinates fall into
        for (const [stateName, bounds] of Object.entries(stateBoundaries)) {
            if (lat >= bounds.minLat && lat <= bounds.maxLat &&
                lng >= bounds.minLng && lng <= bounds.maxLng) {
                return stateName;
            }
        }

        return null;
    };

    // Get state context data for hovered state
    const getStateContextData = () => {
        if (!hoveredState || !stateContextData.length) return null;
        return stateContextData.find(state => state.state === hoveredState) || null;
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
        // Policy click is now handled within the PolicyTimelinePopup component modal
        // This handler is kept for backward compatibility but is no longer needed
    };

    const handleViewPolicyDetails = (policy) => {
        setSelectedPolicyForDashboard(policy);
        setShowAnalyticsDashboard(true);
    };

    // Fly to location function for annotations
    const handleFlyToLocation = (stateName) => {
        if (mapRef.current) {
            // State coordinates mapping (approximate center coordinates)
            const stateCoordinates = {
                'alabama': [32.806671, -86.791130],
                'alaska': [61.370716, -152.404419],
                'arizona': [33.729759, -111.431221],
                'arkansas': [34.969704, -92.373123],
                'california': [36.116203, -119.681564],
                'colorado': [39.059811, -105.311104],
                'connecticut': [41.597782, -72.755371],
                'delaware': [39.318523, -75.507141],
                'florida': [27.766279, -82.640371],
                'georgia': [33.040619, -83.643074],
                'hawaii': [21.094318, -157.498337],
                'idaho': [44.240459, -114.478828],
                'illinois': [40.349457, -88.986137],
                'indiana': [39.849426, -86.258278],
                'iowa': [42.011539, -93.210526],
                'kansas': [38.526600, -96.726486],
                'kentucky': [37.668140, -84.670067],
                'louisiana': [31.169546, -91.867805],
                'maine': [44.323535, -69.765261],
                'maryland': [39.063946, -76.802101],
                'massachusetts': [42.230171, -71.530106],
                'michigan': [43.326618, -84.536095],
                'minnesota': [45.694454, -93.900192],
                'mississippi': [32.741646, -89.678696],
                'missouri': [38.456085, -92.288368],
                'montana': [47.052632, -110.454353],
                'nebraska': [41.125370, -98.268082],
                'nevada': [38.313515, -117.055374],
                'new hampshire': [43.452492, -71.563896],
                'new jersey': [40.298904, -74.521011],
                'new mexico': [34.840515, -106.248482],
                'new york': [42.165726, -74.948051],
                'north carolina': [35.630066, -79.806419],
                'north dakota': [47.528912, -99.784012],
                'ohio': [40.388783, -82.764915],
                'oklahoma': [35.565342, -96.928917],
                'oregon': [44.572021, -122.070938],
                'pennsylvania': [41.203322, -77.194525],
                'rhode island': [41.82355, -71.422132],
                'south carolina': [33.856892, -80.945007],
                'south dakota': [44.299782, -99.438828],
                'tennessee': [35.747845, -86.692345],
                'texas': [31.054487, -97.563461],
                'utah': [40.150032, -111.862434],
                'vermont': [44.045876, -72.710686],
                'virginia': [37.769337, -78.169968],
                'washington': [47.400902, -121.490494],
                'west virginia': [38.491226, -80.954453],
                'wisconsin': [44.268543, -89.616508],
                'wyoming': [42.755966, -107.302490]
            };

            const coordinates = stateCoordinates[stateName.toLowerCase()];
            if (coordinates) {
                mapRef.current.flyTo(coordinates, 6); // Zoom level 6 for state view
            }
        }
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
                    ref={mapRef}
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

                {/* Floating controls for layer toggles */}
                <div className="controls-overlay">
                    <Controls
                        onToggleTimeline={handleTimelineToggle}
                        timelineMode={timelineMode}
                        currentYear={currentYear}
                        availableYears={availableYears}
                    />
                </div>

                {/* Heatmap Legend - positioned independently */}
                <HeatmapLegend />
            </div>


            {/* Policy Timeline Popup */}
            <PolicyTimelinePopup
                isVisible={showPolicyTimeline}
                onClose={handleClosePolicyTimeline}
                availableYears={availableYears}
                currentYear={currentYear}
                onYearChange={handleYearChange}
                onPolicyClick={handlePolicyClick}
                selectedState={selectedState}
                onViewPolicyDetails={handleViewPolicyDetails}
            />

            {/* State Gun Violence Context Panel */}
            <StateGunViolencePanel
                key={panelKey}
                stateData={getStateContextData()}
                isVisible={showStateContextPanel && hoveredState}
                onClose={() => setShowStateContextPanel(false)}
            />

            {/* Resizable Analytics Tab */}
            <ResizableTab
                incidents={incidents}
                timelineData={timelineData}
                availableYears={availableYears}
                getDataForYear={getDataForYear}
                getYearStats={getYearStats}
                selectedPolicyForDashboard={selectedPolicyForDashboard}
                showAnalyticsDashboard={showAnalyticsDashboard}
                onCloseAnalyticsDashboard={() => {
                    setShowAnalyticsDashboard(false);
                    setSelectedPolicyForDashboard(null);
                }}
                onFlyToLocation={handleFlyToLocation}
            />

        </div>
    );
}

// Main App component with routing
function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MapApp />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/methodology" element={<MethodologyPage />} />
            </Routes>
        </Router>
    );
}

export default App;
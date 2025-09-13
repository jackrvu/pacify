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
    const [incidents, setIncidents] = useState([]); // Gun violence incident data
    const [loading, setLoading] = useState(true);
    
    // State for cursor tracking and panel
    const [cursorPosition, setCursorPosition] = useState(null);
    const [mapClickCount, setMapClickCount] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);

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

    // Load CSV data on component mount
    useEffect(() => {
        const loadIncidentData = async () => {
            try {
                setLoading(true);
                // Fetch CSV from public directory

                const response = await fetch('/data/2025_with_locations.csv');
                const csvText = await response.text();

                // Parse CSV with headers using PapaParse library
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setIncidents(results.data);
                        setLoading(false);
                    },
                    error: (error) => {
                        console.error('Error parsing CSV:', error);
                        setLoading(false);
                    }
                });
            } catch (error) {
                console.error('Error loading incident data:', error);
                setLoading(false);
            }
        };

        loadIncidentData();
    }, []);

    // Layer toggle handlers for controls
    const handleToggleCountyLayer = (enabled) => {
        setShowCountyLayer(enabled);
    };

    const handleToggleHeatMapLayer = (enabled) => {
        setShowHeatMapLayer(enabled);
    };

    const handleTogglePinsLayer = (enabled) => {
        setShowPinsLayer(enabled);
    };

    // Cursor and panel handlers
    const handleCursorMove = (position) => {
        setCursorPosition(position);
    };

    const handleMapClick = () => {
        setMapClickCount(prev => prev + 1);
    };

    // Show loading screen while CSV data loads
    if (loading) {
        return (
            <div className="loading-screen">
                <h1>Pacify</h1>
                <p>Loading incident data...</p>
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
                        onToggleCountyLayer={handleToggleCountyLayer}
                        onToggleHeatMapLayer={handleToggleHeatMapLayer}
                        onTogglePinsLayer={handleTogglePinsLayer}
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
        </div>
    );
}

export default App;
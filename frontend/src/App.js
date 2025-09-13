import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Papa from 'papaparse';
import MapLayer from './components/MapLayer';
import Controls from './components/Controls';
import IncidentHeatmap from './components/IncidentHeatmap';
import './App.css';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function App() {
    const [showCountyLayer, setShowCountyLayer] = useState(true);
    const [showHeatMapLayer, setShowHeatMapLayer] = useState(true);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load incident data automatically on component mount
    useEffect(() => {
        const loadIncidentData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/data/2025_deaths.csv');
                const csvText = await response.text();

                // Parse CSV data using PapaParse
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

    const handleToggleCountyLayer = (enabled) => {
        setShowCountyLayer(enabled);
    };

    const handleToggleHeatMapLayer = (enabled) => {
        setShowHeatMapLayer(enabled);
    };

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
                    center={[39.8283, -98.5795]} // Center of US
                    zoom={4}
                    style={{ height: '100vh', width: '100vw' }}
                    zoomControl={true}
                    attributionControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {showCountyLayer && (
                        <MapLayer enabled={showCountyLayer} />
                    )}

                    {showHeatMapLayer && (
                        <IncidentHeatmap incidents={incidents} />
                    )}
                </MapContainer>

                <div className="controls-overlay">
                    <Controls
                        onToggleCountyLayer={handleToggleCountyLayer}
                        onToggleHeatMapLayer={handleToggleHeatMapLayer}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
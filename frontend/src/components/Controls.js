// Map layer controls component - provides checkboxes to toggle map layers
import React, { useState } from 'react';
import './Controls.css';

function Controls({ onToggleCountyLayer, onToggleHeatMapLayer, onTogglePinsLayer }) {
    // Local state to track checkbox states
    const [showCountyLayer, setShowCountyLayer] = useState(true);
    const [showHeatMapLayer, setShowHeatMapLayer] = useState(true);
    const [showPinsLayer, setShowPinsLayer] = useState(true);

    // Toggle county choropleth layer
    const handleToggleCountyLayer = () => {
        const newValue = !showCountyLayer;
        setShowCountyLayer(newValue);
        if (onToggleCountyLayer) {
            onToggleCountyLayer(newValue);
        }
    };

    // Toggle incident heatmap layer
    const handleToggleHeatMapLayer = () => {
        const newValue = !showHeatMapLayer;
        setShowHeatMapLayer(newValue);
        if (onToggleHeatMapLayer) {
            onToggleHeatMapLayer(newValue);
        }
    };

    // Toggle incident pins layer
    const handleTogglePinsLayer = () => {
        const newValue = !showPinsLayer;
        setShowPinsLayer(newValue);
        if (onTogglePinsLayer) {
            onTogglePinsLayer(newValue);
        }
    };

    return (
        <div className="map-controls">
            <h3>Map Layers</h3>
            <div className="control-item">
                <label>
                    <input
                        type="checkbox"
                        checked={showCountyLayer}
                        onChange={handleToggleCountyLayer}
                    />
                    County Data Layer (Blue)
                </label>
            </div>
            <div className="control-item">
                <label>
                    <input
                        type="checkbox"
                        checked={showHeatMapLayer}
                        onChange={handleToggleHeatMapLayer}
                    />
                    Incident Heatmap
                </label>
            </div>
            <div className="control-item">
                <label>
                    <input
                        type="checkbox"
                        checked={showPinsLayer}
                        onChange={handleTogglePinsLayer}
                    />
                    Incident Pins
                </label>
            </div>
        </div>
    );
}

export default Controls;
// Map layer controls component - provides checkboxes to toggle map layers
import React, { useState } from 'react';
import './Controls.css';

<<<<<<< HEAD
function Controls({ onToggleCountyLayer, onToggleHeatMapLayer }) {
    // Local state to track checkbox states
=======
function Controls({ onToggleCountyLayer, onTogglePinsLayer }) {
>>>>>>> 0891af6 (Push latest changes to main)
    const [showCountyLayer, setShowCountyLayer] = useState(true);
    const [showPinsLayer, setShowPinsLayer] = useState(true);

    // Toggle county choropleth layer
    const handleToggleCountyLayer = () => {
        const newValue = !showCountyLayer;
        setShowCountyLayer(newValue);
        if (onToggleCountyLayer) {
            onToggleCountyLayer(newValue);
        }
    };

<<<<<<< HEAD
    // Toggle incident heatmap layer
    const handleToggleHeatMapLayer = () => {
        const newValue = !showHeatMapLayer;
        setShowHeatMapLayer(newValue);
        if (onToggleHeatMapLayer) {
            onToggleHeatMapLayer(newValue);
=======
    const handleTogglePinsLayer = () => {
        const newValue = !showPinsLayer;
        setShowPinsLayer(newValue);
        if (onTogglePinsLayer) {
            onTogglePinsLayer(newValue);
>>>>>>> 0891af6 (Push latest changes to main)
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
import React, { useState } from 'react';
import './Controls.css';

function Controls({ onToggleCountyLayer, onToggleHeatMapLayer }) {
    const [showCountyLayer, setShowCountyLayer] = useState(true);
    const [showHeatMapLayer, setShowHeatMapLayer] = useState(true);

    const handleToggleCountyLayer = () => {
        const newValue = !showCountyLayer;
        setShowCountyLayer(newValue);
        if (onToggleCountyLayer) {
            onToggleCountyLayer(newValue);
        }
    };

    const handleToggleHeatMapLayer = () => {
        const newValue = !showHeatMapLayer;
        setShowHeatMapLayer(newValue);
        if (onToggleHeatMapLayer) {
            onToggleHeatMapLayer(newValue);
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
                    Heat Map Layer (Red)
                </label>
            </div>
        </div>
    );
}

export default Controls;
// Map layer controls component - provides checkboxes to toggle map layers
import React, { useState } from 'react';
import './Controls.css';

function Controls({ 
    onToggleCountyLayer, 
    onToggleHeatMapLayer, 
    onTogglePinsLayer, 
    onToggleTimeline,
    timelineMode = false 
}) {
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

    // Toggle timeline mode
    const handleToggleTimeline = () => {
        const newValue = !timelineMode;
        if (onToggleTimeline) {
            onToggleTimeline(newValue);
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
            
            {/* Timeline Mode Toggle */}
            <div className="control-section">
                <h4>Timeline View</h4>
                <div className="control-item timeline-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={timelineMode}
                            onChange={handleToggleTimeline}
                        />
                        <span className="timeline-label">
                            {timelineMode ? 'Timeline Mode (1995-2025)' : 'Enable Timeline View'}
                        </span>
                    </label>
                    {timelineMode && (
                        <div className="timeline-hint">
                            Use timeline controls below to navigate through years
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Controls;
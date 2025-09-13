// Controls component - displays current year and manages timeline mode
// Provides visual indicator of selected year and auto-enables timeline mode
import React from 'react';
import './Controls.css';

function Controls({ 
    onToggleTimeline,
    timelineMode = false,
    currentYear = 2025,
    availableYears = [],
    onToggle3DView,
    show3DView = false
}) {
    // Auto-enable timeline mode on mount
    React.useEffect(() => {
        if (!timelineMode && onToggleTimeline) {
            onToggleTimeline(true);
        }
    }, [timelineMode, onToggleTimeline]);

    return (
        <div className="year-display-controls">
            <div className="current-year-badge">
                {currentYear}
            </div>
            
            {/* View Mode Toggle */}
            <div className="view-mode-section">
                <div className="view-mode-label">View Mode:</div>
                <div 
                    className={`view-toggle ${show3DView ? 'active' : ''}`}
                    onClick={() => onToggle3DView && onToggle3DView(!show3DView)}
                    title={show3DView ? 'Switch to Heatmap View' : 'Switch to 3D Globe View'}
                >
                    <div className="view-toggle-icon">
                        {show3DView ? '🔥' : '🌍'}
                    </div>
                    <div className="view-toggle-label">
                        {show3DView ? 'Heatmap' : '3D Globe'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Controls;
// Year display component - shows current year with timeline toggle
import React from 'react';
import './Controls.css';

function Controls({ 
    onToggleTimeline,
    timelineMode = false,
    currentYear = 2025,
    availableYears = []
}) {
    // Toggle timeline mode
    const handleToggleTimeline = () => {
        const newValue = !timelineMode;
        if (onToggleTimeline) {
            onToggleTimeline(newValue);
        }
    };

    const minYear = availableYears.length > 0 ? Math.min(...availableYears) : 2025;
    const maxYear = availableYears.length > 0 ? Math.max(...availableYears) : 2025;

    return (
        <div className="year-display-controls">
            <div className="year-display-header">
                <h3>Current Year</h3>
                <div className="year-range">({minYear} - {maxYear})</div>
            </div>
            
            <div className="current-year-section">
                <div className="current-year-badge">
                    {currentYear}
                </div>
            </div>
            
            {/* Timeline Mode Toggle */}
            <div className="timeline-toggle-section">
                <button 
                    className={`timeline-toggle-btn ${timelineMode ? 'active' : ''}`}
                    onClick={handleToggleTimeline}
                >
                    <span className="timeline-icon">📅</span>
                    <span className="timeline-text">
                        {timelineMode ? 'Timeline Active' : 'Enable Timeline'}
                    </span>
                </button>
                {timelineMode && (
                    <div className="timeline-hint">
                        Timeline controls available below
                    </div>
                )}
            </div>
        </div>
    );
}

export default Controls;
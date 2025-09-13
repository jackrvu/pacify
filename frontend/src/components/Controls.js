// Controls component - displays current year and manages timeline mode
// Provides visual indicator of selected year and auto-enables timeline mode
import React from 'react';
import './Controls.css';

function Controls({
    onToggleTimeline,
    timelineMode = false,
    currentYear = 2025,
    availableYears = []
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

        </div>
    );
}

export default Controls;
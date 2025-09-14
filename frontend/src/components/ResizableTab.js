// ResizableTab component - A resizable side tab that expands to fill screen
// Provides smooth animations and drag-to-resize functionality

import React, { useState, useEffect, useRef } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import './ResizableTab.css';

const ResizableTab = ({ 
    incidents, 
    timelineData, 
    availableYears, 
    getDataForYear, 
    getYearStats,
    selectedPolicyForDashboard,
    showAnalyticsDashboard,
    onCloseAnalyticsDashboard,
    onFlyToLocation,
    onTabExpandedChange
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [tabWidth, setTabWidth] = useState(60); // Default collapsed width
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartWidth, setDragStartWidth] = useState(0);
    
    const tabRef = useRef(null);
    const resizeHandleRef = useRef(null);

    // Handle tab toggle
    const toggleTab = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            // When expanding, set to full screen width
            setTabWidth(window.innerWidth);
        } else {
            // When collapsing, reset to default width
            setTabWidth(60);
        }
    };

    // Handle mouse down on resize handle
    const handleResizeStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setIsResizing(true);
        setDragStartX(e.clientX);
        setDragStartWidth(tabWidth);
        
        // Add global event listeners
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    // Handle resize movement
    const handleResizeMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const newWidth = Math.max(300, Math.min(window.innerWidth * 0.8, dragStartWidth + deltaX));
        setTabWidth(newWidth);
    };

    // Handle resize end
    const handleResizeEnd = () => {
        setIsDragging(false);
        setIsResizing(false);
        
        // Remove global event listeners
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    // Handle touch events for mobile
    const handleTouchStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setIsResizing(true);
        setDragStartX(e.touches[0].clientX);
        setDragStartWidth(tabWidth);
        
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.touches[0].clientX - dragStartX;
        const newWidth = Math.max(300, Math.min(window.innerWidth * 0.8, dragStartWidth + deltaX));
        setTabWidth(newWidth);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setIsResizing(false);
        
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    // Auto-expand on mobile when opened
    useEffect(() => {
        if (isExpanded && window.innerWidth <= 768) {
            setTabWidth(window.innerWidth * 0.9);
        }
    }, [isExpanded]);

    // Handle escape key to close
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isExpanded) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isExpanded]);

    // Auto-expand when policy is selected for dashboard
    useEffect(() => {
        if (showAnalyticsDashboard && selectedPolicyForDashboard && !isExpanded) {
            setIsExpanded(true);
            setTabWidth(window.innerWidth);
        }
    }, [showAnalyticsDashboard, selectedPolicyForDashboard, isExpanded]);

    // Notify parent when expansion state changes
    useEffect(() => {
        if (onTabExpandedChange) {
            onTabExpandedChange(isExpanded);
        }
    }, [isExpanded, onTabExpandedChange]);

    return (
        <div className="resizable-tab-container">
            {/* Tab Button */}
            <div 
                className={`tab-button ${isExpanded ? 'expanded' : ''}`}
                onClick={toggleTab}
                style={{ 
                    left: isExpanded ? `${tabWidth - 35}px` : '0px',
                    transition: isResizing ? 'none' : 'left 0.3s ease'
                }}
            >
                <div className="tab-icon">
                    ▶
                </div>
            </div>

            {/* Tab Content */}
            <div 
                ref={tabRef}
                className={`tab-content ${isExpanded ? 'expanded' : ''}`}
                style={{ 
                    width: `${tabWidth}px`,
                    transition: isResizing ? 'none' : 'width 0.3s ease'
                }}
            >
                {/* Resize Handle */}
                <div 
                    ref={resizeHandleRef}
                    className={`resize-handle ${isResizing ? 'active' : ''}`}
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleTouchStart}
                >
                    <div className="resize-grip">
                        <div className="grip-line"></div>
                        <div className="grip-line"></div>
                        <div className="grip-line"></div>
                    </div>
                </div>


                {/* Dashboard Content */}
                <div className="tab-dashboard">
                    <AnalyticsDashboard 
                        incidents={incidents}
                        timelineData={timelineData}
                        availableYears={availableYears}
                        getDataForYear={getDataForYear}
                        getYearStats={getYearStats}
                        onClose={() => {
                            setIsExpanded(false);
                            if (onCloseAnalyticsDashboard) {
                                onCloseAnalyticsDashboard();
                            }
                        }}
                        selectedPolicyForDashboard={selectedPolicyForDashboard}
                        showAnalyticsDashboard={showAnalyticsDashboard}
                        onFlyToLocation={onFlyToLocation}
                    />
                </div>
            </div>

            {/* Overlay when expanded */}
            {isExpanded && (
                <div 
                    className="tab-overlay"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </div>
    );
};

export default ResizableTab;

import React, { useEffect, useRef, useCallback } from 'react';
import './StateGunViolencePanel.css';

const StateGunViolencePanel = ({ stateData, isVisible, onClose, hoveredCounty }) => {
    const contentRef = useRef(null);
    const scrollIntervalRef = useRef(null);
    const scrollPositionRef = useRef(0);
    const isScrollingRef = useRef(false);

    // Function to start auto-scrolling - ONLY DOWNWARD
    const startAutoScroll = useCallback(() => {
        if (!contentRef.current || !isVisible || !stateData) return;

        const contentElement = contentRef.current;
        const scrollHeight = contentElement.scrollHeight;
        const clientHeight = contentElement.clientHeight;

        // Only auto-scroll if content is taller than container
        if (scrollHeight <= clientHeight) return;

        // Clear any existing interval
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
        }

        // ALWAYS start from top for new state - INSTANT, no smooth scrolling
        contentElement.scrollTop = 0;
        scrollPositionRef.current = 0;

        const scrollSpeed = 0.5; // pixels per frame
        const scrollDelay = 16; // ~60fps

        scrollIntervalRef.current = setInterval(() => {
            if (!contentRef.current || !isVisible || !stateData) {
                clearInterval(scrollIntervalRef.current);
                return;
            }

            const currentElement = contentRef.current;
            const currentScrollHeight = currentElement.scrollHeight;
            const currentClientHeight = currentElement.clientHeight;

            // ONLY SCROLL DOWN - NEVER UP
            scrollPositionRef.current += scrollSpeed;

            // When reaching bottom, instantly snap back to top (no upward scrolling)
            if (scrollPositionRef.current >= currentScrollHeight - currentClientHeight) {
                scrollPositionRef.current = 0;
                currentElement.scrollTop = 0; // Instant snap, no gradual movement
            } else {
                currentElement.scrollTop = scrollPositionRef.current;
            }
        }, scrollDelay);

        isScrollingRef.current = true;
    }, [isVisible, stateData]);

    // Function to stop auto-scrolling
    const stopAutoScroll = useCallback(() => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
        isScrollingRef.current = false;
    }, []);

    // Start auto-scrolling when panel becomes visible
    useEffect(() => {
        if (isVisible && stateData) {
            // Always start fresh since component is recreated with new key
            startAutoScroll();
        } else {
            // Stop scrolling when not visible
            stopAutoScroll();
        }

        // Cleanup on unmount
        return () => {
            stopAutoScroll();
        };
    }, [isVisible, stateData, startAutoScroll, stopAutoScroll]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAutoScroll();
        };
    }, [stopAutoScroll]);

    if (!isVisible || !stateData) {
        return null;
    }

    return (
        <div className="state-gun-violence-panel">
            <div className="panel-header">
                <div className="header-content">
                    <h3>{stateData.state} Gun Violence</h3>
                    {hoveredCounty && (
                        <div className="county-info">
                            <small>Currently viewing: {hoveredCounty.countyName} County</small>
                        </div>
                    )}
                    <div className="gemini-attribution">
                        <small>information powered by Gemini 2.5 Pro with Search</small>
                    </div>
                </div>
                <button className="close-button" onClick={onClose} aria-label="Close panel">
                    ×
                </button>
            </div>
            <div className="panel-content" ref={contentRef}>
                <div className="context-text">
                    {stateData.context}
                </div>
            </div>
        </div>
    );
};

export default StateGunViolencePanel;

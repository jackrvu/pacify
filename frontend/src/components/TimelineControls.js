// TimelineControls component - provides interactive timeline navigation
// Supports auto-play, manual scrubbing, and smooth transitions between years
// Includes pause functionality and customizable transition speeds
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './TimelineControls.css';

const TimelineControls = ({ 
    availableYears = [],
    currentYear,
    onYearChange,
    yearStats = {},
    className = ''
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [transitionSpeed, setTransitionSpeed] = useState(2000); // milliseconds per year
    const [pauseDuration, setPauseDuration] = useState(1000); // milliseconds to pause on each year
    const [pausePoints, setPausePoints] = useState(new Set()); // Years to pause on
    const [currentDecimalYear, setCurrentDecimalYear] = useState(currentYear);
    const [isPaused, setIsPaused] = useState(false);
    
    // Refs for animation
    const animationRef = useRef(null);
    const lastTimestampRef = useRef(0);
    const pauseStartRef = useRef(0);
    const targetYearRef = useRef(currentYear);
    const currentDecimalYearRef = useRef(currentYear);
    const isPlayingRef = useRef(false);

    // Get the next year in sequence
    const getNextYear = (year) => {
        const currentIndex = availableYears.indexOf(year);
        const nextIndex = (currentIndex + 1) % availableYears.length;
        return availableYears[nextIndex];
    };

    // Simple year increment function - just go to next year every 2 seconds
    const incrementYear = useCallback(() => {
        const currentIntYear = Math.floor(currentDecimalYearRef.current);
        const currentIndex = availableYears.indexOf(currentIntYear);
        const nextIndex = (currentIndex + 1) % availableYears.length;
        const nextYear = availableYears[nextIndex];
        
        currentDecimalYearRef.current = nextYear;
        setCurrentDecimalYear(nextYear);
        onYearChange(nextYear);
        
        // Schedule next increment if still playing
        setTimeout(() => {
            if (isPlayingRef.current) {
                incrementYear();
            }
        }, 2000); // 2 seconds
    }, [availableYears, onYearChange]);

    // Start simple year increment
    const startAutoPlay = useCallback(() => {
        if (availableYears.length === 0) return;
        
        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsPaused(false);
        
        console.log('Starting year increment from year:', Math.floor(currentDecimalYearRef.current));
        
        // Start incrementing immediately
        incrementYear();
    }, [availableYears, incrementYear]);

    // Stop year increment
    const stopAutoPlay = useCallback(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsPaused(false);
    }, []);

    // Handle play/pause
    const handlePlayPause = () => {
        if (isPlaying) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    };

    // Handle transition speed change
    const handleTransitionSpeedChange = (newSpeed) => {
        setTransitionSpeed(newSpeed);
    };

    // Handle pause duration change
    const handlePauseDurationChange = (newDuration) => {
        setPauseDuration(newDuration);
    };

    // Toggle pause point for a year
    const togglePausePoint = (year) => {
        setPausePoints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(year)) {
                newSet.delete(year);
            } else {
                newSet.add(year);
            }
            return newSet;
        });
    };

    // Handle year slider change
    const handleSliderChange = (event) => {
        const year = parseInt(event.target.value);
        setCurrentDecimalYear(year);
        currentDecimalYearRef.current = year;
        targetYearRef.current = year;
        onYearChange(year);
    };

    // Handle year button click
    const handleYearButtonClick = (year) => {
        setCurrentDecimalYear(year);
        currentDecimalYearRef.current = year;
        targetYearRef.current = year;
        onYearChange(year);
    };

    // Navigate to previous/next year
    const handlePrevYear = () => {
        const currentIndex = availableYears.indexOf(Math.floor(currentDecimalYear));
        if (currentIndex > 0) {
            const newYear = availableYears[currentIndex - 1];
            setCurrentDecimalYear(newYear);
            currentDecimalYearRef.current = newYear;
            targetYearRef.current = newYear;
            onYearChange(newYear);
        }
    };

    const handleNextYear = () => {
        const currentIndex = availableYears.indexOf(Math.floor(currentDecimalYear));
        if (currentIndex < availableYears.length - 1) {
            const newYear = availableYears[currentIndex + 1];
            setCurrentDecimalYear(newYear);
            currentDecimalYearRef.current = newYear;
            targetYearRef.current = newYear;
            onYearChange(newYear);
        }
    };

    // Sync with parent component's currentYear changes
    useEffect(() => {
        if (currentYear !== Math.floor(currentDecimalYear)) {
            setCurrentDecimalYear(currentYear);
            currentDecimalYearRef.current = currentYear;
            targetYearRef.current = currentYear;
        }
    }, [currentYear, currentDecimalYear]);

    // Keep ref in sync with state
    useEffect(() => {
        currentDecimalYearRef.current = currentDecimalYear;
    }, [currentDecimalYear]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setIsPlaying(false);
            isPlayingRef.current = false;
        };
    }, []);

    if (availableYears.length === 0) {
        return <div className={`timeline-controls loading ${className}`}>Loading timeline...</div>;
    }

    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);
    const currentIndex = availableYears.indexOf(Math.floor(currentDecimalYear));
    const displayYear = Math.floor(currentDecimalYear);

    return (
        <div className={`timeline-controls ${className}`}>


            {/* Minimalist Timeline Controls */}
            <div className="minimalist-timeline">
                <button 
                    className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause timeline' : 'Play timeline'}
                >
                    {isPlaying ? '⏸️' : '▶️'}
                </button>
                
                <input
                    type="range"
                    min={minYear}
                    max={maxYear}
                    value={displayYear}
                    onChange={handleSliderChange}
                    className="timeline-slider"
                    title={`Year: ${displayYear}`}
                />
                
                <div className="year-range-display">
                    {minYear} - {maxYear}
                </div>
            </div>
        </div>
    );
};

export default TimelineControls;

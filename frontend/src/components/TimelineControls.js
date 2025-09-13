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
            <div className="timeline-header">
                <h3>Timeline View</h3>
                <div className="year-display">
                    <span className="current-year">{displayYear}</span>
                    <span className="year-range">({minYear} - {maxYear})</span>
                    {isPaused && <span className="pause-indicator">⏸️ PAUSED</span>}
                </div>
            </div>

            {/* Year Statistics */}
            {yearStats && (
                <div className="year-stats">
                    <span className="stat">
                        <strong>{yearStats.totalIncidents || 0}</strong> incidents
                    </span>
                    <span className="stat">
                        <strong>{yearStats.totalKilled || 0}</strong> killed
                    </span>
                    <span className="stat">
                        <strong>{yearStats.totalInjured || 0}</strong> injured
                    </span>
                </div>
            )}

            {/* Main Timeline Slider */}
            <div className="timeline-slider-container">
                <button 
                    className="nav-button prev"
                    onClick={handlePrevYear}
                    disabled={currentIndex === 0}
                    title="Previous year"
                >
                    ◀
                </button>
                
                <div className="slider-wrapper">
                    <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={displayYear}
                        onChange={handleSliderChange}
                        className="year-slider"
                        step="1"
                    />
                    <div className="slider-track">
                        <div className="year-markers">
                            {availableYears.filter((_, index) => index % 5 === 0).map(year => (
                                <div 
                                    key={year}
                                    className="year-marker"
                                    style={{
                                        left: `${((year - minYear) / (maxYear - minYear)) * 100}%`
                                    }}
                                >
                                    {year}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    className="nav-button next"
                    onClick={handleNextYear}
                    disabled={currentIndex === availableYears.length - 1}
                    title="Next year"
                >
                    ▶
                </button>
            </div>

            {/* Playback Controls */}
            <div className="playback-controls">
                <button 
                    className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause timeline' : 'Play timeline'}
                >
                    {isPlaying ? '⏸️' : '▶️'}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <div className="speed-controls">
                    <div className="control-group">
                        <label htmlFor="transition-speed">Transition:</label>
                        <select 
                            id="transition-speed"
                            value={transitionSpeed} 
                            onChange={(e) => handleTransitionSpeedChange(parseInt(e.target.value))}
                            className="speed-selector"
                        >
                            <option value={4000}>Slow</option>
                            <option value={2000}>Normal</option>
                            <option value={1000}>Fast</option>
                            <option value={500}>Very Fast</option>
                        </select>
                    </div>
                    
                    <div className="control-group">
                        <label htmlFor="pause-duration">Pause:</label>
                        <select 
                            id="pause-duration"
                            value={pauseDuration} 
                            onChange={(e) => handlePauseDurationChange(parseInt(e.target.value))}
                            className="speed-selector"
                        >
                            <option value={0}>None</option>
                            <option value={500}>0.5s</option>
                            <option value={1000}>1s</option>
                            <option value={2000}>2s</option>
                            <option value={3000}>3s</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Year Selection with Pause Points */}
            <div className="quick-years">
                <div className="quick-years-label">
                    Quick Jump: 
                    <span className="pause-hint">(Right-click to set pause points)</span>
                </div>
                <div className="year-buttons">
                    {availableYears.filter((_, index) => index % 3 === 0 || index === availableYears.length - 1).map(year => (
                        <button
                            key={year}
                            onClick={() => handleYearButtonClick(year)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                togglePausePoint(year);
                            }}
                            className={`year-btn ${year === displayYear ? 'active' : ''} ${pausePoints.has(year) ? 'pause-point' : ''}`}
                            title={`${pausePoints.has(year) ? 'Remove pause point' : 'Right-click to add pause point'} - ${year}`}
                        >
                            {year}
                            {pausePoints.has(year) && <span className="pause-dot">●</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Progress Indicator */}
            <div className="progress-indicator">
                <div className="progress-bar">
                    <div 
                        className="progress-fill"
                        style={{
                            width: `${((displayYear - minYear) / (maxYear - minYear)) * 100}%`
                        }}
                    />
                </div>
                <div className="progress-text">
                    {displayYear} of {availableYears.length} years
                    {pausePoints.size > 0 && (
                        <span className="pause-count">
                            ({pausePoints.size} pause point{pausePoints.size !== 1 ? 's' : ''})
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelineControls;

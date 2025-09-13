import React, { useState, useEffect, useCallback } from 'react';
import './TimelineControls.css';

const TimelineControls = ({ 
    availableYears = [],
    currentYear,
    onYearChange,
    yearStats = {},
    className = ''
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(1000); // milliseconds
    const [playInterval, setPlayInterval] = useState(null);

    // Auto-play functionality
    const startAutoPlay = useCallback(() => {
        if (availableYears.length === 0) return;

        const interval = setInterval(() => {
            onYearChange(prevYear => {
                const currentIndex = availableYears.indexOf(prevYear);
                const nextIndex = (currentIndex + 1) % availableYears.length;
                return availableYears[nextIndex];
            });
        }, playSpeed);

        setPlayInterval(interval);
    }, [availableYears, playSpeed, onYearChange]);

    const stopAutoPlay = useCallback(() => {
        if (playInterval) {
            clearInterval(playInterval);
            setPlayInterval(null);
        }
    }, [playInterval]);

    // Handle play/pause
    const handlePlayPause = () => {
        if (isPlaying) {
            stopAutoPlay();
            setIsPlaying(false);
        } else {
            startAutoPlay();
            setIsPlaying(true);
        }
    };

    // Handle speed change
    const handleSpeedChange = (newSpeed) => {
        setPlaySpeed(newSpeed);
        
        // Restart auto-play with new speed if currently playing
        if (isPlaying) {
            stopAutoPlay();
            setTimeout(() => {
                startAutoPlay();
            }, 50);
        }
    };

    // Handle year slider change
    const handleSliderChange = (event) => {
        const year = parseInt(event.target.value);
        onYearChange(year);
    };

    // Handle year button click
    const handleYearButtonClick = (year) => {
        onYearChange(year);
    };

    // Navigate to previous/next year
    const handlePrevYear = () => {
        const currentIndex = availableYears.indexOf(currentYear);
        if (currentIndex > 0) {
            onYearChange(availableYears[currentIndex - 1]);
        }
    };

    const handleNextYear = () => {
        const currentIndex = availableYears.indexOf(currentYear);
        if (currentIndex < availableYears.length - 1) {
            onYearChange(availableYears[currentIndex + 1]);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (playInterval) {
                clearInterval(playInterval);
            }
        };
    }, [playInterval]);

    // Update interval when speed changes
    useEffect(() => {
        if (isPlaying) {
            stopAutoPlay();
            startAutoPlay();
        }
    }, [playSpeed, isPlaying, startAutoPlay, stopAutoPlay]);

    if (availableYears.length === 0) {
        return <div className={`timeline-controls loading ${className}`}>Loading timeline...</div>;
    }

    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);
    const currentIndex = availableYears.indexOf(currentYear);

    return (
        <div className={`timeline-controls ${className}`}>
            <div className="timeline-header">
                <h3>Timeline View</h3>
                <div className="year-display">
                    <span className="current-year">{currentYear}</span>
                    <span className="year-range">({minYear} - {maxYear})</span>
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
                        value={currentYear}
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
                    <label htmlFor="speed-select">Speed:</label>
                    <select 
                        id="speed-select"
                        value={playSpeed} 
                        onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                        className="speed-selector"
                    >
                        <option value={2000}>0.5x</option>
                        <option value={1000}>1x</option>
                        <option value={500}>2x</option>
                        <option value={250}>4x</option>
                    </select>
                </div>
            </div>

            {/* Quick Year Selection */}
            <div className="quick-years">
                <div className="quick-years-label">Quick Jump:</div>
                <div className="year-buttons">
                    {availableYears.filter((_, index) => index % 3 === 0 || index === availableYears.length - 1).map(year => (
                        <button
                            key={year}
                            onClick={() => handleYearButtonClick(year)}
                            className={`year-btn ${year === currentYear ? 'active' : ''}`}
                            title={`Jump to ${year}`}
                        >
                            {year}
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
                            width: `${((currentIndex + 1) / availableYears.length) * 100}%`
                        }}
                    />
                </div>
                <div className="progress-text">
                    {currentIndex + 1} of {availableYears.length} years
                </div>
            </div>
        </div>
    );
};

export default TimelineControls;

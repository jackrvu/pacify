// HeatmapLegend component - displays a clickable legend for the heatmap layer
// Shows color gradient and explains what each color intensity represents
import React, { useState } from 'react';
import './HeatmapLegend.css';

const HeatmapLegend = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const colorStops = [
        { color: '#808080', intensity: '0.1', casualties: '0', description: 'No casualties' },
        { color: '#FFFF00', intensity: '0.2', casualties: '1', description: '1 casualty' },
        { color: '#FF8000', intensity: '0.3', casualties: '2', description: '2 casualties' },
        { color: '#FF4000', intensity: '0.4', casualties: '3', description: '3 casualties' },
        { color: '#FF0000', intensity: '0.5', casualties: '4', description: '4 casualties' },
        { color: '#CC0000', intensity: '0.6', casualties: '5-6', description: '5-6 casualties' },
        { color: '#990000', intensity: '0.7', casualties: '7-8', description: '7-8 casualties' },
        { color: '#660000', intensity: '0.8', casualties: '9-12', description: '9-12 casualties' },
        { color: '#330000', intensity: '0.9', casualties: '13-20', description: '13-20 casualties' },
        { color: '#000000', intensity: '1.0', casualties: '20+', description: '20+ casualties' }
    ];

    const handleLegendClick = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    return (
        <>
            {/* Legend Button */}
            <div className="heatmap-legend-button" onClick={handleLegendClick}>
                <div className="legend-icon">🔥</div>
                <span className="legend-text">Heatmap Legend</span>
            </div>

            {/* Legend Modal */}
            {isModalOpen && (
                <div className="heatmap-legend-modal-overlay" onClick={handleCloseModal}>
                    <div className="heatmap-legend-modal" onClick={handleModalClick}>
                        <div className="heatmap-legend-header">
                            <h3>Heatmap Legend</h3>
                            <button
                                className="heatmap-legend-close"
                                onClick={handleCloseModal}
                                aria-label="Close legend"
                            >
                                ×
                            </button>
                        </div>

                        <div className="heatmap-legend-content">
                            <p className="heatmap-legend-description">
                                The heatmap shows the intensity of gun violence incidents based on the total number of casualties (killed + injured) at each location.
                            </p>

                            <div className="heatmap-legend-gradient">
                                <div className="gradient-bar">
                                    {colorStops.map((stop, index) => (
                                        <div
                                            key={index}
                                            className="gradient-segment"
                                            style={{ backgroundColor: stop.color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="heatmap-legend-entries">
                                {colorStops.map((stop, index) => (
                                    <div key={index} className="legend-entry">
                                        <div
                                            className="legend-color-box"
                                            style={{ backgroundColor: stop.color }}
                                        />
                                        <div className="legend-details">
                                            <span className="legend-casualties">{stop.casualties} casualties</span>
                                            <span className="legend-description">{stop.description}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="heatmap-legend-note">
                                <p><strong>Note:</strong> The heatmap uses a radius-based clustering algorithm. Denser areas with multiple incidents will appear more intense even if individual incidents have fewer casualties.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HeatmapLegend;

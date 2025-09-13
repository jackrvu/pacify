import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import './IncidentModal.css';

const IncidentHeatmap = ({ incidents }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);
    const [filteredIncidents, setFilteredIncidents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalIncidents, setModalIncidents] = useState([]);
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

    // Filter incidents that have geocoding matches and valid coordinates
    useEffect(() => {
        if (!incidents || incidents.length === 0) return;

        const filtered = incidents.filter(incident => {
            const hasCoordinates = incident.Latitude && incident.Longitude &&
                incident.Latitude !== '' && incident.Longitude !== '';
            const hasMatch = incident['Geocoding Match'] === 'Match';
            return hasCoordinates && hasMatch;
        });

        setFilteredIncidents(filtered);
    }, [incidents]);

    // Create heat map layer
    useEffect(() => {
        if (!map || filteredIncidents.length === 0) return;

        // Remove existing heat layer
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
        }

        // Prepare heat map data
        const heatData = filteredIncidents.map(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            const victimsKilled = parseInt(incident['Victims Killed'] || 0);
            const victimsInjured = parseInt(incident['Victims Injured'] || 0);

            // Calculate intensity based on casualties
            const intensity = Math.max(0.1, victimsKilled * 2 + victimsInjured * 0.5 + 0.1);

            return [lat, lng, intensity];
        });

        // Create heat map layer with yellow to red gradient
        heatLayerRef.current = L.heatLayer(heatData, {
            radius: 30,
            blur: 20,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: 'yellow',
                0.2: 'orange',
                0.4: 'red',
                0.6: 'darkred',
                0.8: 'maroon',
                1.0: 'darkred'
            }
        });

        // Add click event to the heat layer
        heatLayerRef.current.on('click', (e) => {
            const clickLat = e.latlng.lat;
            const clickLng = e.latlng.lng;

            // Find incidents within a reasonable radius of the click
            const radius = 0.01; // Approximately 1km radius
            const nearbyIncidents = filteredIncidents.filter(incident => {
                const lat = parseFloat(incident.Latitude);
                const lng = parseFloat(incident.Longitude);
                const distance = Math.sqrt(
                    Math.pow(lat - clickLat, 2) + Math.pow(lng - clickLng, 2)
                );
                return distance <= radius;
            });

            if (nearbyIncidents.length > 0) {
                setModalIncidents(nearbyIncidents);
                setModalPosition({ x: e.containerPoint.x, y: e.containerPoint.y });
                setShowModal(true);
            }
        });

        // Add heat layer to map
        heatLayerRef.current.addTo(map);

        // Cleanup function
        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
            }
        };
    }, [map, filteredIncidents]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showModal && !event.target.closest('.incident-modal')) {
                setShowModal(false);
            }
        };

        if (showModal) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showModal]);

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    };

    const getSeverityColor = (killed, injured) => {
        const total = killed + injured;
        if (total >= 10) return '#8B0000'; // Dark red
        if (total >= 5) return '#DC143C'; // Crimson
        if (total >= 3) return '#FF4500'; // Orange red
        if (total >= 1) return '#FF8C00'; // Dark orange
        return '#FFD700'; // Gold
    };

    return (
        <>
            {showModal && (
                <div
                    className="incident-modal"
                    style={{
                        position: 'absolute',
                        left: `${modalPosition.x}px`,
                        top: `${modalPosition.y}px`,
                        padding: '16px',
                        maxWidth: '400px',
                        maxHeight: '500px',
                        zIndex: 1000,
                        transform: 'translate(-50%, -100%)',
                        marginTop: '-10px'
                    }}
                >
                    <div className="modal-header">
                        <h3>
                            Incidents ({modalIncidents.length})
                        </h3>
                        <button
                            onClick={() => setShowModal(false)}
                            className="close-button"
                        >
                            ×
                        </button>
                    </div>

                    <div className="modal-content">
                        {modalIncidents.map((incident, index) => (
                            <div
                                key={incident['Incident ID'] || index}
                                className="incident-item"
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '8px'
                                }}>
                                    <div>
                                        <strong style={{ color: '#333' }}>
                                            {incident.City || incident['City Or County']}, {incident.State}
                                        </strong>
                                        <div className="incident-date">
                                            {formatDate(incident['Incident Date'])}
                                        </div>
                                    </div>
                                    <div
                                        className="severity-badge"
                                        style={{
                                            backgroundColor: getSeverityColor(
                                                parseInt(incident['Victims Killed'] || 0),
                                                parseInt(incident['Victims Injured'] || 0)
                                            )
                                        }}
                                    >
                                        {incident['Victims Killed'] || 0}K / {incident['Victims Injured'] || 0}I
                                    </div>
                                </div>

                                <div className="incident-address">
                                    <div><strong>Address:</strong> {incident.Address}</div>
                                    {incident['Matched Address'] && (
                                        <div className="matched-address">
                                            <strong>Matched:</strong> {incident['Matched Address']}
                                        </div>
                                    )}
                                </div>

                                {(incident['Suspects Killed'] || incident['Suspects Injured'] || incident['Suspects Arrested']) && (
                                    <div className="suspects-info">
                                        <strong>Suspects:</strong>
                                        {incident['Suspects Killed'] && ` ${incident['Suspects Killed']}K`}
                                        {incident['Suspects Injured'] && ` ${incident['Suspects Injured']}I`}
                                        {incident['Suspects Arrested'] && ` ${incident['Suspects Arrested']}A`}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default IncidentHeatmap;
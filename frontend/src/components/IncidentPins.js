import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './IncidentModal.css';

const IncidentPins = ({ incidents }) => {
    const map = useMap();
    const markersRef = useRef([]);
    const [showModal, setShowModal] = useState(false);
    const [modalIncidents, setModalIncidents] = useState([]);
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

    // Create markers for incidents with coordinates
    useEffect(() => {
        if (!map || !incidents || incidents.length === 0) return;

        // Clear existing markers
        markersRef.current.forEach(marker => {
            map.removeLayer(marker);
        });
        markersRef.current = [];

        // Filter incidents that have valid coordinates
        const incidentsWithCoords = incidents.filter(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        // Create markers for each incident
        incidentsWithCoords.forEach(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            const killed = parseInt(incident['Victims Killed'] || 0);
            const injured = parseInt(incident['Victims Injured'] || 0);

            // Create custom icon based on severity
            const severityColor = getSeverityColor(killed, injured);
            const iconSize = getIconSize(killed, injured);

            const customIcon = L.divIcon({
                className: 'custom-pin',
                html: `
                    <div style="
                        background-color: ${severityColor};
                        width: ${iconSize}px;
                        height: ${iconSize}px;
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: ${iconSize > 20 ? '12px' : '10px'};
                    ">
                        ${killed + injured}
                    </div>
                `,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize / 2]
            });

            const marker = L.marker([lat, lng], { icon: customIcon });

            // Add click event to marker
            marker.on('click', (e) => {
                setModalIncidents([incident]);
                setModalPosition({ x: e.containerPoint.x, y: e.containerPoint.y });
                setShowModal(true);
            });

            marker.addTo(map);
            markersRef.current.push(marker);
        });

        // Cleanup function
        return () => {
            markersRef.current.forEach(marker => {
                map.removeLayer(marker);
            });
            markersRef.current = [];
        };
    }, [map, incidents]);

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

    const getIconSize = (killed, injured) => {
        const total = killed + injured;
        if (total >= 10) return 30; // Large for high casualties
        if (total >= 5) return 25;  // Medium-large
        if (total >= 3) return 20;  // Medium
        if (total >= 1) return 15;  // Small
        return 12; // Very small for no casualties
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
                            Incident Details
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
                                            {incident['City Or County']}, {incident.State}
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

export default IncidentPins;

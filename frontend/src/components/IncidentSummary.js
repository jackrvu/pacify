// IncidentSummary component - compact display of incident counts with toggle for detailed panel
// Shows incident statistics in a small top-right widget with expandable detailed view
import React, { useState, useEffect } from 'react';
import './IncidentSummary.css';

function IncidentSummary({
    incidents,
    currentYear,
    selectedState,
    cursorPosition,
    onMapClick,
    isMobile
}) {
    const [nearbyIncidents, setNearbyIncidents] = useState([]);

    // Calculate distance between two points
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Update nearby incidents based on cursor position
    useEffect(() => {
        if (!cursorPosition || !incidents || incidents.length === 0) {
            setNearbyIncidents([]);
            return;
        }

        const { lat, lng, zoom } = cursorPosition;

        // Convert incident data to points with proper filtering
        const points = incidents
            .map(incident => ({
                lat: parseFloat(incident.Latitude),
                lng: parseFloat(incident.Longitude),
                data: incident
            }))
            .filter(point => !isNaN(point.lat) && !isNaN(point.lng));

        // Use zoom-aware search radius
        let searchRadius;
        if (zoom >= 12) {
            searchRadius = 0.05;
        } else if (zoom >= 10) {
            searchRadius = 0.1;
        } else if (zoom >= 8) {
            searchRadius = 0.25;
        } else if (zoom >= 6) {
            searchRadius = 0.5;
        } else if (zoom >= 4) {
            searchRadius = 1.0;
        } else {
            searchRadius = 2.0;
        }

        const nearby = points.filter(point => {
            const distance = Math.sqrt(
                Math.pow(lat - point.lat, 2) +
                Math.pow(lng - point.lng, 2)
            );
            return distance <= searchRadius;
        }).map(point => ({
            ...point.data,
            distance: calculateDistance(lat, lng, point.lat, point.lng)
        }));

        // Remove duplicates and sort by distance
        const uniqueIncidents = nearby.filter((incident, index, self) =>
            index === self.findIndex(i => i['Incident ID'] === incident['Incident ID'])
        ).sort((a, b) => a.distance - b.distance);

        setNearbyIncidents(uniqueIncidents);
    }, [cursorPosition, incidents]);

    // Calculate total casualties
    const getTotalCasualties = (incidents) => {
        return incidents.reduce((total, incident) => {
            const killed = parseInt(incident['Victims Killed'] || 0);
            const injured = parseInt(incident['Victims Injured'] || 0);
            return total + killed + injured;
        }, 0);
    };

    // Get state-specific incidents for the current year
    const getStateIncidents = () => {
        if (!selectedState || !incidents) return [];
        return incidents.filter(incident =>
            incident.State && incident.State.toLowerCase() === selectedState.toLowerCase()
        );
    };


    // Determine what data to show
    const displayData = selectedState ? getStateIncidents() : nearbyIncidents;
    const totalIncidents = displayData.length;
    const totalCasualties = getTotalCasualties(displayData);
    const displayTitle = selectedState
        ? `${selectedState} (${currentYear})`
        : nearbyIncidents.length > 0
            ? "Nearby Area"
            : "No Area Selected";

    return (
        <div className="incident-summary-widget">
            <div className="summary-content">
                <div className="summary-header">
                    <h4>{displayTitle}</h4>
                </div>

                <div className="summary-stats">
                    <div className="stat-item">
                        <span className="stat-number">{totalIncidents}</span>
                        <span className="stat-label">Incident{totalIncidents !== 1 ? 's' : ''}</span>
                    </div>

                    {totalCasualties > 0 && (
                        <div className="stat-item">
                            <span className="stat-number">{totalCasualties}</span>
                            <span className="stat-label">Casualt{totalCasualties !== 1 ? 'ies' : 'y'}</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default IncidentSummary;

// Incident heatmap component - displays heat layer from incident data with coordinates
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const IncidentHeatmap = ({ incidents, enabled = true }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);

    // Filter incidents that have valid coordinates
    const filteredIncidents = incidents.filter(incident => {
        const lat = parseFloat(incident.Latitude);
        const lng = parseFloat(incident.Longitude);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    // Render heatmap layer on map using Leaflet.heat
    useEffect(() => {
        if (!map || filteredIncidents.length === 0 || !enabled) {
            // Remove existing layer if disabled or no data
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        // Clean up existing layer
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

        // Create heat map layer with yellow to red gradient (similar to icemap)
        heatLayerRef.current = L.heatLayer(heatData, {
            radius: 25,
            blur: 20,
            maxZoom: 10,
            gradient: {
                0.0: '#FFFF00',   // Yellow for low intensity
                0.2: '#FFD700',   // Gold
                0.4: '#FF8C00',   // Dark orange
                0.6: '#DC143C',   // Crimson
                0.8: '#B22222',   // Fire brick
                1.0: '#8B0000'    // Dark maroon for high intensity
            }
        });

        // Create a special pane for heat if it doesn't exist
        if (!map.getPane('heatPane')) {
            map.createPane('heatPane');
            map.getPane('heatPane').style.zIndex = 400;
        }

        heatLayerRef.current.addTo(map);

        // Cleanup function
        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
            }
        };
    }, [map, filteredIncidents, enabled]);

    return null;
};

export default IncidentHeatmap;
// Incident heatmap component - displays heat layer from incident data with coordinates
// Uses Leaflet.heat plugin to create density visualization of gun violence incidents
// Intensity based on victim count (killed + injured) with color gradient from white to black
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const IncidentHeatmap = ({ incidents, enabled = true }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);

    // Filter incidents that have valid coordinates (exclude invalid lat/lng)
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

        // Limit data points for performance (sample every Nth incident)
        const maxPoints = 2000;
        const step = Math.max(1, Math.floor(filteredIncidents.length / maxPoints));
        const sampledIncidents = filteredIncidents.filter((_, index) => index % step === 0);

        // Prepare heat map data with better intensity calculation
        const heatData = sampledIncidents.map(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            const victimsKilled = parseInt(incident['Victims Killed'] || 0);
            const victimsInjured = parseInt(incident['Victims Injured'] || 0);

            // Highly distinct intensity calculation with dramatic jumps
            const totalCasualties = victimsKilled + victimsInjured;
            let intensity;
            
            if (totalCasualties === 0) {
                intensity = 0.1;   // White
            } else if (totalCasualties === 1) {
                intensity = 0.2;  // Bright yellow
            } else if (totalCasualties === 2) {
                intensity = 0.3;  // Bright orange
            } else if (totalCasualties === 3) {
                intensity = 0.4;  // Bright red-orange
            } else if (totalCasualties === 4) {
                intensity = 0.5;  // Bright red
            } else if (totalCasualties <= 6) {
                intensity = 0.6;  // Dark red
            } else if (totalCasualties <= 8) {
                intensity = 0.7;  // Darker red
            } else if (totalCasualties <= 12) {
                intensity = 0.8;  // Very dark red
            } else if (totalCasualties <= 20) {
                intensity = 0.9;  // Almost black red
            } else {
                intensity = 1.0;  // Pure black
            }

            return [lat, lng, intensity];
        });

        // Create heat map layer with highly distinct settings
        heatLayerRef.current = L.heatLayer(heatData, {
            radius: 8,         // Much smaller radius for precise hotspots
            blur: 4,           // Minimal blur for sharp edges
            maxZoom: 15,       // Allow higher zoom levels
            minOpacity: 0.6,   // Higher opacity for better visibility
            gradient: {
                0.0: 'transparent',  // Transparent for no data
                0.1: '#FFFFFF',     // White
                0.2: '#FFFF00',     // Bright yellow
                0.3: '#FF8000',     // Bright orange
                0.4: '#FF4000',     // Bright red-orange
                0.5: '#FF0000',     // Bright red
                0.6: '#CC0000',     // Dark red
                0.7: '#990000',     // Darker red
                0.8: '#660000',     // Very dark red
                0.9: '#330000',     // Almost black red
                1.0: '#000000'      // Pure black for maximum intensity
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
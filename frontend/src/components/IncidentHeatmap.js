import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const IncidentHeatmap = ({ incidents }) => {
    const map = useMap();
    const heatLayerRef = useRef(null);
    const [geocodedIncidents, setGeocodedIncidents] = useState([]);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Google Places API geocoding function
    const geocodeAddress = async (address, city, state) => {
        const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            console.warn('Google Places API key not found');
            return null;
        }

        try {
            const fullAddress = `${address}, ${city}, ${state}`;
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return [location.lat, location.lng];
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        return null;
    };

    // Geocode incidents with coordinates
    useEffect(() => {
        const geocodeIncidents = async () => {
            if (!incidents || incidents.length === 0) return;

            setIsGeocoding(true);
            const geocoded = [];

            // Process incidents in batches to avoid rate limiting
            const batchSize = 10;
            for (let i = 0; i < incidents.length; i += batchSize) {
                const batch = incidents.slice(i, i + batchSize);
                const batchPromises = batch.map(async (incident) => {
                    const { Address, 'City Or County': city, State } = incident;
                    if (Address && city && State) {
                        const coords = await geocodeAddress(Address, city, State);
                        if (coords) {
                            return {
                                ...incident,
                                coordinates: coords,
                                intensity: parseInt(incident['Victims Killed'] || 0) +
                                    parseInt(incident['Victims Injured'] || 0) + 1
                            };
                        }
                    }
                    return null;
                });

                const batchResults = await Promise.all(batchPromises);
                geocoded.push(...batchResults.filter(result => result !== null));

                // Add delay between batches to respect rate limits
                if (i + batchSize < incidents.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            setGeocodedIncidents(geocoded);
            setIsGeocoding(false);
        };

        geocodeIncidents();
    }, [incidents]);

    // Create heat map layer
    useEffect(() => {
        if (!map || geocodedIncidents.length === 0) return;

        // Remove existing heat layer
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
        }

        // Prepare heat map data
        const heatData = geocodedIncidents.map(incident => [
            incident.coordinates[0], // lat
            incident.coordinates[1], // lng
            incident.intensity // intensity
        ]);

        // Create heat map layer
        heatLayerRef.current = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
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
    }, [map, geocodedIncidents]);

    // Show loading indicator while geocoding
    if (isGeocoding) {
        return (
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '20px',
                borderRadius: '8px',
                zIndex: 1000,
                textAlign: 'center'
            }}>
                <div>Geocoding incidents...</div>
                <div style={{ fontSize: '12px', marginTop: '5px' }}>
                    {geocodedIncidents.length} of {incidents.length} processed
                </div>
            </div>
        );
    }

    return null;
};

export default IncidentHeatmap;

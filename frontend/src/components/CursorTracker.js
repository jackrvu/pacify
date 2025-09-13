// CursorTracker component - tracks mouse movement and clicks on map
// Converts screen coordinates to lat/lng and provides cursor position to parent components
// Used for dynamic incident panel updates and state detection
import React, { useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';

function CursorTracker({ onCursorMove, onMapClick }) {
    const map = useMap();

    // Memoize event handlers to prevent recreation
    const handleMouseMove = useCallback((e) => {
        // Convert screen coordinates to lat/lng
        const latlng = map.containerPointToLatLng([e.originalEvent.clientX, e.originalEvent.clientY]);
        onCursorMove({
            lat: latlng.lat,
            lng: latlng.lng,
            zoom: map.getZoom()
        });
    }, [map, onCursorMove]);

    const handleMouseLeave = useCallback(() => {
        // Clear cursor position when mouse leaves map
        onCursorMove(null);
    }, [onCursorMove]);

    const handleMapClick = useCallback(() => {
        if (onMapClick) {
            onMapClick();
        }
    }, [onMapClick]);

    useEffect(() => {
        map.on('mousemove', handleMouseMove);
        map.on('mouseout', handleMouseLeave);

        // Priority: always fire onMapClick on map click
        if (onMapClick) {
            map.on('click', handleMapClick);
        }

        return () => {
            map.off('mousemove', handleMouseMove);
            map.off('mouseout', handleMouseLeave);
            if (onMapClick) {
                map.off('click', handleMapClick);
            }
        };
    }, [map, handleMouseMove, handleMouseLeave, handleMapClick, onMapClick]);

    return null;
}

export default CursorTracker;

// County choropleth layer component - displays US counties colored by data density
// Uses D3 scales for color mapping and Leaflet GeoJSON for rendering
// Loads real county incident data from CSV and maps it to GeoJSON features

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as d3Scale from 'd3-scale';
import * as d3Interpolate from 'd3-scale-chromatic';
import { interpolateRgb } from 'd3-interpolate';
import './MapLayer.css';

function MapLayer({ enabled = true, onCountyHover }) {
    const map = useMap();
    const [countyData, setCountyData] = useState(null); // GeoJSON county boundaries from external source
    const [caseData, setCaseData] = useState({}); // Real incident data loaded from CSV
    const geojsonLayerRef = useRef(null);

    // Track map movement to prevent tooltip flicker during pan/zoom
    const [isMapMoving, setIsMapMoving] = useState(false);

    // Track if we're currently dragging to prevent tooltip creation
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!map) return;
        const handleMoveStart = () => {
            setIsMapMoving(true);
            setIsDragging(true);
        };
        const handleMoveEnd = () => {
            setIsMapMoving(false);
            setIsDragging(false);
        };
        const handleDragStart = () => setIsDragging(true);
        const handleDragEnd = () => setIsDragging(false);

        map.on('movestart', handleMoveStart);
        map.on('moveend', handleMoveEnd);
        map.on('dragstart', handleDragStart);
        map.on('dragend', handleDragEnd);

        return () => {
            map.off('movestart', handleMoveStart);
            map.off('moveend', handleMoveEnd);
            map.off('dragstart', handleDragStart);
            map.off('dragend', handleDragEnd);
        };
    }, [map]);

    // No tooltip functionality needed

    // D3 color scale for county fill colors - red gradient based on case count
    const colorScale = useMemo(() => {
        if (!Object.keys(caseData).length) return null;

        const caseCounts = Object.values(caseData).map(data => data.totalCases).filter(count => count > 0);
        const minCount = Math.min(...caseCounts) || 0;
        const maxCount = Math.max(...caseCounts) || 1;

        // Custom red gradient interpolator for high-impact visualization
        const customInterpolator = t => {
            // Lower 40%: light red to dark red
            if (t < 0.4) {
                return interpolateRgb("#fc9272", "#de2d26")(t / 0.4);
            }
            // Upper 60%: dark red to very dark red
            return interpolateRgb("#de2d26", "#800026")((t - 0.4) / 0.6);
        };

        return d3Scale.scaleSequential()
            .domain([minCount, maxCount])
            .interpolator(customInterpolator);
    }, [caseData]);

    // Memoize the opacity scale
    const opacityScale = useMemo(() => {
        if (!Object.keys(caseData).length) return null;

        const caseCounts = Object.values(caseData).map(data => data.totalCases).filter(count => count > 0);
        const minCount = Math.min(...caseCounts) || 0;
        const maxCount = Math.max(...caseCounts) || 1;

        return d3Scale.scaleLinear()
            .domain([minCount, maxCount])
            .range([0.5, 0.95]);
    }, [caseData]);

    // Memoize the style function to prevent recreation on every render
    const styleFunction = useCallback((feature) => {
        if (!colorScale || !opacityScale) {
            return {
                fillColor: '#ffffff',
                weight: 0.8,
                opacity: 1,
                color: '#e34a33',
                fillOpacity: 0.2,
                className: 'county-polygon',
                zIndex: 100
            };
        }

        // Try to find county data by matching county name and state
        const countyName = feature.properties.NAME;
        const stateFips = feature.properties.STATE;
        const countyKey = `${countyName}_${stateFips}`;

        const countyData = caseData[countyKey] || { totalCases: 0, cases90Days: 0 };
        const caseCount = countyData.totalCases;
        let fillColor = '#ffffff';
        let fillOpacity = 0.2;
        let borderColor = '#e34a33';
        let borderWeight = 0.8;
        let zIndex = 100;

        if (caseCount > 0) {
            fillColor = colorScale(caseCount);
            fillOpacity = opacityScale(caseCount);
        }

        return {
            fillColor: fillColor,
            weight: borderWeight,
            opacity: 1,
            color: borderColor,
            fillOpacity: fillOpacity,
            className: 'county-polygon',
            zIndex: zIndex
        };
    }, [colorScale, opacityScale, caseData]);

    // Memoize the onEachFeature function
    const onEachFeatureFunction = useCallback((feature, layer) => {
        // Extract county name from properties
        const countyName = feature.properties.NAME;
        const stateFips = feature.properties.STATE;
        const countyKey = `${countyName}_${stateFips}`;
        const countyData = caseData[countyKey] || { totalCases: 0, cases90Days: 0 };
        const caseCount = countyData.totalCases;
        const caseCount90Days = countyData.cases90Days;

        // Format case counts with commas
        const formattedCount = caseCount.toLocaleString();
        const formattedCount90Days = caseCount90Days.toLocaleString();

        // No tooltip - just highlighting on hover

        // Add event listeners for hover highlighting only (no click functionality)
        layer.on({
            mouseover: function (e) {
                const l = e.target;
                l.setStyle({
                    weight: 2.5,
                    color: '#1a4a8a',
                    fillOpacity: 0.95,
                    dashArray: ''
                });

                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    l.bringToFront();
                }

                // Call the callback with county information
                if (onCountyHover) {
                    onCountyHover({
                        countyName: countyName,
                        stateFips: stateFips,
                        caseCount: caseCount,
                        caseCount90Days: caseCount90Days
                    });
                }
            },
            mouseout: function (e) {
                geojsonLayerRef.current.resetStyle(e.target);
                
                // Clear county hover information
                if (onCountyHover) {
                    onCountyHover(null);
                }
            },
            click: function (e) {
                // Completely prevent any click functionality
                if (e.originalEvent) {
                    e.originalEvent.preventDefault();
                    e.originalEvent.stopPropagation();
                }
                return false; // Prevent further event propagation
            },
            mousedown: function (e) {
                // Prevent default Leaflet highlighting
                if (e.originalEvent) {
                    e.originalEvent.preventDefault();
                    e.originalEvent.stopPropagation();
                }
                return false; // Prevent further event propagation
            }
        });
    }, [caseData, isMapMoving, isDragging, onCountyHover]);

    // Memoize the style function and onEachFeatureFunction refs to avoid unnecessary re-creation
    const styleFunctionRef = useRef();
    const onEachFeatureFunctionRef = useRef();
    styleFunctionRef.current = styleFunction;
    onEachFeatureFunctionRef.current = onEachFeatureFunction;

    useEffect(() => {
        // Load the US counties GeoJSON
        const loadCountyData = async () => {
            try {
                // Using a public counties GeoJSON source
                const response = await fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
                const data = await response.json();
                setCountyData(data);
            } catch (error) {
                console.error('Error loading county data:', error);
            }
        };

        // Load real county incident data
        const loadCaseData = async () => {
            try {
                const response = await fetch('/data/county_incident_summary.csv');
                const csvText = await response.text();

                // Parse CSV data
                const lines = csvText.split('\n');
                const headers = lines[0].split(',');
                const countyData = {};

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = line.split(',');
                    const countyName = values[0];
                    const stateFips = values[1];
                    const totalIncidents = parseInt(values[2]) || 0;
                    const totalKilled = parseInt(values[3]) || 0;
                    const totalInjured = parseInt(values[4]) || 0;

                    // Create FIPS code from state FIPS (need to pad to 5 digits)
                    const stateFipsPadded = Math.floor(parseFloat(stateFips)).toString().padStart(2, '0');
                    // For now, we'll use county name as key since we don't have full FIPS codes
                    const countyKey = `${countyName}_${stateFipsPadded}`;

                    countyData[countyKey] = {
                        totalCases: totalIncidents,
                        cases90Days: Math.floor(totalIncidents * 0.1), // Estimate 90-day cases as 10% of total
                        countyName: countyName,
                        stateFips: stateFipsPadded
                    };
                }

                setCaseData(countyData);
            } catch (error) {
                console.error('Error loading county data:', error);
                // Fallback to empty data instead of sample data
                setCaseData({});
            }
        };

        loadCountyData();
        loadCaseData();

        return () => {
            if (geojsonLayerRef.current) {
                map.removeLayer(geojsonLayerRef.current);
            }
        };
    }, []); // Remove map dependency to prevent recreation on zoom

    useEffect(() => {
        if (!countyData || !Object.keys(caseData).length || !enabled) {
            return;
        }

        // Remove existing layer
        if (geojsonLayerRef.current) {
            map.removeLayer(geojsonLayerRef.current);
        }

        // Create GeoJSON layer
        geojsonLayerRef.current = L.geoJSON(countyData, {
            style: styleFunctionRef.current,
            interactive: true, // Re-enable interactions for hover events
            onEachFeature: onEachFeatureFunctionRef.current
        });

        // Add the layer to the map
        if (enabled) {
            // Create a custom pane for the choropleth layer to control z-index
            if (!map.getPane('countyPane')) {
                map.createPane('countyPane');
                map.getPane('countyPane').style.zIndex = 200; // Lower value to ensure it's below the heat map layer
            }

            geojsonLayerRef.current.options.pane = 'countyPane';
            geojsonLayerRef.current.addTo(map);
        } else {
            // Remove the layer if not enabled
            if (geojsonLayerRef.current) {
                map.removeLayer(geojsonLayerRef.current);
            }
        }

        return () => {
            if (geojsonLayerRef.current) {
                map.removeLayer(geojsonLayerRef.current);
            }
        };

    }, [countyData, caseData, enabled]); // Only depend on data and enabled

    // No tooltip cleanup needed

    return null;
}

export default MapLayer;

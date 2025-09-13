// Violence3DGlobe component - Interactive 3D globe with choropleth and ripple effects
// Uses react-globe.gl for professional 3D globe rendering

import React, { useMemo, useRef, useState, useEffect } from 'react';
import Globe from 'react-globe.gl';
import { scaleSequentialSqrt, scaleLinear } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';
import { interpolateRgb } from 'd3-interpolate';
import './Violence3DGlobe.css';

function Violence3DGlobe({ incidents, enabled = true }) {
    const globeRef = useRef();
    const [rings, setRings] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [countries, setCountries] = useState({ features: [] });
    const [hoverD, setHoverD] = useState();
    const [countyData, setCountyData] = useState(null); // GeoJSON county boundaries
    const [caseData, setCaseData] = useState({}); // Real incident data from CSV

    // Ensure incidents is always an array
    const safeIncidents = incidents || [];

    // Fetch world countries data for choropleth
    useEffect(() => {
        // Use the same data source as the official example
        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
            .then(res => res.json())
            .then(data => {
                setCountries(data);
            })
            .catch(err => {
                console.error('Failed to load countries data:', err);
                // Fallback to USA polygon
                const usaPolygon = {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: { 
                            NAME: 'United States of America', 
                            ISO_A2: 'US' 
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[
                                [-125, 49], [-66, 49], [-66, 25], [-97, 25], 
                                [-97, 30], [-106, 30], [-114, 32], [-125, 32], [-125, 49]
                            ]]
                        }
                    }]
                };
                setCountries(usaPolygon);
            });
    }, []);

    // Load county data - same as 2D version
    useEffect(() => {
        // Load the US counties GeoJSON
        const loadCountyData = async () => {
            try {
                // Using the same public counties GeoJSON source as 2D
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
                
                // Parse CSV data - same logic as 2D
                const lines = csvText.split('\n');
                const headers = lines[0].split(',');
                const countyData = {};
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const values = line.split(',');
                    if (values.length >= headers.length) {
                        const countyName = values[0];
                        const stateFips = values[1];
                        const totalCases = parseInt(values[2]) || 0;
                        const cases90Days = parseInt(values[3]) || 0;
                        
                        const countyKey = `${countyName}_${stateFips}`;
                        countyData[countyKey] = {
                            totalCases,
                            cases90Days
                        };
                    }
                }
                
                setCaseData(countyData);
            } catch (error) {
                console.error('Error loading case data:', error);
            }
        };

        loadCountyData();
        loadCaseData();
    }, []);

    // Process violence data by country
    const countryViolenceData = useMemo(() => {
        if (!enabled || !safeIncidents || safeIncidents.length === 0) return {};

        const violenceByCountry = {};
        
        safeIncidents.forEach(incident => {
            const killed = parseInt(incident['Victims Killed'] || 0);
            const injured = parseInt(incident['Victims Injured'] || 0);
            const casualties = killed + injured;

            if (casualties > 0) {
                // All incidents are in the US
                const country = 'United States of America';
                
                if (!violenceByCountry[country]) {
                    violenceByCountry[country] = {
                        totalCasualties: 0,
                        incidentCount: 0,
                        states: new Set()
                    };
                }
                violenceByCountry[country].totalCasualties += casualties;
                violenceByCountry[country].incidentCount += 1;
                violenceByCountry[country].states.add(incident.State);
            }
        });

        return violenceByCountry;
    }, [safeIncidents, enabled]);

    // Create color scale for violence intensity
    const colorScale = useMemo(() => {
        const maxViolence = Math.max(...Object.values(countryViolenceData).map(d => d.totalCasualties), 1);
        return scaleSequentialSqrt(interpolateYlOrRd).domain([0, maxViolence]);
    }, [countryViolenceData]);

    // County color scale - same as 2D version (red gradient)
    const countyColorScale = useMemo(() => {
        if (!caseData || Object.keys(caseData).length === 0) return null;
        
        const maxCases = Math.max(...Object.values(caseData).map(d => d.totalCases), 1);
        return scaleLinear()
            .domain([0, maxCases])
            .range(['#ffffff', '#800000'])
            .interpolate(interpolateRgb);
    }, [caseData]);

    // County opacity scale - same as 2D version
    const countyOpacityScale = useMemo(() => {
        if (!caseData || Object.keys(caseData).length === 0) return null;
        
        const maxCases = Math.max(...Object.values(caseData).map(d => d.totalCases), 1);
        return scaleLinear()
            .domain([0, maxCases])
            .range([0.2, 0.95]);
    }, [caseData]);

    // Get violence value for a country
    const getViolenceValue = (countryName) => {
        return countryViolenceData[countryName]?.totalCasualties || 0;
    };

    // Get county case data - same logic as 2D
    const getCountyCaseData = (countyName, stateFips) => {
        const countyKey = `${countyName}_${stateFips}`;
        return caseData[countyKey] || { totalCases: 0, cases90Days: 0 };
    };

    // Process incident data for points and rings
    const pointsData = useMemo(() => {
        if (!enabled || !safeIncidents || safeIncidents.length === 0) return [];

        // Filter incidents with valid coordinates
        const validIncidents = safeIncidents.filter(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        // Group nearby incidents
        const locationGroups = {};
        const groupRadius = 0.3; // Degrees

        validIncidents.forEach(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            const killed = parseInt(incident['Victims Killed'] || 0);
            const injured = parseInt(incident['Victims Injured'] || 0);
            const casualties = killed + injured;

            // Find existing group or create new one
            let foundGroup = null;
            for (const [key, group] of Object.entries(locationGroups)) {
                const [groupLat, groupLng] = key.split(',').map(Number);
                const distance = Math.sqrt(
                    Math.pow(lat - groupLat, 2) + Math.pow(lng - groupLng, 2)
                );
                if (distance <= groupRadius) {
                    foundGroup = group;
                    break;
                }
            }

            if (foundGroup) {
                foundGroup.incidents.push(incident);
                foundGroup.totalCasualties += casualties;
            } else {
                const key = `${lat},${lng}`;
                locationGroups[key] = {
                    lat,
                    lng,
                    incidents: [incident],
                    totalCasualties: casualties,
                    state: incident.State
                };
            }
        });

        return Object.values(locationGroups)
            .filter(group => group.totalCasualties > 0)
            .map(group => ({
                lat: group.lat,
                lng: group.lng,
                intensity: Math.min(1, group.totalCasualties / 20),
                casualties: group.totalCasualties,
                incidentCount: group.incidents.length,
                state: group.state,
                incidents: group.incidents
            }))
            .sort((a, b) => b.intensity - a.intensity);
    }, [safeIncidents, enabled]);

    // Color function for violence intensity
    const getViolenceColor = (intensity) => {
        // Color gradient: blue (low) -> green -> yellow -> orange -> red (high)
        if (intensity < 0.2) {
            const t = intensity / 0.2;
            return `rgb(${Math.floor(0 + t * 100)}, ${Math.floor(100 + t * 155)}, 255)`;
        } else if (intensity < 0.4) {
            const t = (intensity - 0.2) / 0.2;
            return `rgb(${Math.floor(100 + t * 155)}, 255, ${Math.floor(255 - t * 255)})`;
        } else if (intensity < 0.6) {
            const t = (intensity - 0.4) / 0.2;
            return `rgb(255, ${Math.floor(255 - t * 100)}, 0)`;
        } else if (intensity < 0.8) {
            const t = (intensity - 0.6) / 0.2;
            return `rgb(255, ${Math.floor(155 - t * 55)}, 0)`;
        } else {
            const t = (intensity - 0.8) / 0.2;
            return `rgb(255, ${Math.floor(100 - t * 100)}, ${Math.floor(0 + t * 100)})`;
        }
    };

    // Handle point click to create ripple rings
    const handlePointClick = (point) => {
        setSelectedLocation(point);
        
        // Create ripple ring
        const newRing = {
            lat: point.lat,
            lng: point.lng,
            maxRadius: 20,
            propagationSpeed: 50,
            repeatPeriod: 2000,
            color: getViolenceColor(point.intensity)
        };
        
        setRings(prev => [...prev, newRing]);
        
        // Remove ring after animation
        setTimeout(() => {
            setRings(prev => prev.filter(ring => ring !== newRing));
        }, 3000);
    };


    // Configure globe settings - clean choropleth focus
    const globeConfig = {
        width: '100%',
        height: '100%',
        backgroundColor: '#000011',
        // Clean globe without Earth texture
        globeImageUrl: '//unpkg.com/three-globe/example/img/earth-night.jpg',
        backgroundImageUrl: '//unpkg.com/three-globe/example/img/night-sky.png',
        showAtmosphere: false,
        showGraticules: false,
        enablePointerInteraction: true,
        animateIn: true,
        onGlobeReady: () => {
            if (globeRef.current) {
                globeRef.current.pointOfView({ lat: 39.8283, lng: -98.5795, altitude: 2.5 });
            }
        }
    };

    if (!enabled || (!pointsData.length && !countries.features.length)) {
        return (
            <div className="violence-3d-globe-container">
                <div className="violence-3d-loading">
                    <div className="violence-3d-loading-spinner"></div>
                    <div>Loading 3D Globe...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="violence-3d-globe-container">
            {/* Title */}
            <div className="violence-3d-title">
                <h2>3D Violence Globe</h2>
                <p>Click on points to see ripple effects</p>
            </div>

            {/* 3D Globe */}
            <Globe
                ref={globeRef}
                {...globeConfig}
                
                // Combined layer with hover - optimized performance
                polygonsData={[
                    ...countries.features,
                    ...(countyData && countyData.features ? countyData.features : [])
                ]}
                polygonAltitude={d => {
                    // Check if it's a county (has STATE property)
                    if (d.properties && d.properties.STATE) {
                        const countyData = getCountyCaseData(d.properties.NAME, d.properties.STATE);
                        const baseHeight = countyData.totalCases > 0 ? 0.12 : 0.08;
                        // Counties lift on hover
                        return d === hoverD ? baseHeight + 0.08 : baseHeight;
                    }
                    // Countries stay lower (background)
                    return 0.06;
                }}
                polygonCapColor={d => {
                    // Check if it's a county (has STATE property)
                    if (d.properties && d.properties.STATE) {
                        if (!countyColorScale) return '#ffffff';
                        const countyData = getCountyCaseData(d.properties.NAME, d.properties.STATE);
                        // Counties change color on hover
                        return d === hoverD ? '#ffffff' : (countyData.totalCases > 0 ? countyColorScale(countyData.totalCases) : '#ffffff');
                    }
                    // Countries keep their color (no hover color change)
                    return colorScale(getViolenceValue(d.properties?.NAME));
                }}
                polygonSideColor={d => {
                    // Check if it's a county (has STATE property)
                    if (d.properties && d.properties.STATE) {
                        return 'rgba(128, 0, 0, 0.1)';
                    }
                    // It's a country
                    return 'rgba(0, 100, 0, 0.15)';
                }}
                polygonStrokeColor={d => {
                    // Check if it's a county (has STATE property)
                    if (d.properties && d.properties.STATE) {
                        return '#800000';
                    }
                    // It's a country
                    return '#111';
                }}
                polygonStrokeWidth={d => {
                    // Check if it's a county (has STATE property)
                    if (d.properties && d.properties.STATE) {
                        return 0.3;
                    }
                    // It's a country
                    return 1;
                }}
                polygonLabel={({ properties: d }) => {
                    // Check if it's a county (has STATE property)
                    if (d && d.STATE) {
                        const countyData = getCountyCaseData(d.NAME, d.STATE);
                        return <div>
                            <div><b>{d.NAME}, {d.STATE}</b></div>
                            <div>Total Cases: <i>{countyData.totalCases}</i></div>
                            <div>90-Day Cases: <i>{countyData.cases90Days}</i></div>
                        </div>;
                    }
                    // It's a country
                    return <div>
                        <div><b>{d?.NAME} ({d?.ISO_A2}):</b></div>
                        <div>Violence: <i>{getViolenceValue(d?.NAME)}</i> casualties</div>
                        <div>Incidents: <i>{countryViolenceData[d?.NAME]?.incidentCount || 0}</i></div>
                    </div>;
                }}
                onPolygonHover={setHoverD}
                polygonsTransitionDuration={200} // Faster transitions
                
                // Minimal points for performance
                pointsData={pointsData && pointsData.length > 0 ? pointsData.slice(0, 5) : []}
                pointLat="lat"
                pointLng="lng"
                pointColor={d => getViolenceColor(d.intensity)}
                pointAltitude={d => d.intensity * 0.01}
                pointRadius={d => Math.max(0.02, d.intensity * 0.2)}
                pointResolution={4}
                pointLabel={d => `${d.state}: ${d.casualties} casualties`}
                onPointClick={handlePointClick}
                
                // Minimal ripple rings
                ringsData={rings}
                ringLat="lat"
                ringLng="lng"
                ringMaxRadius="maxRadius"
                ringPropagationSpeed="propagationSpeed"
                ringRepeatPeriod="repeatPeriod"
                ringColor="color"
                ringResolution={8}
            />

            {/* Selected Location Info */}
            {selectedLocation && (
                <div className="violence-3d-info-panel">
                    <h4>{selectedLocation.state}</h4>
                    <div className="info-stats">
                        <div className="stat-item">
                            <span className="stat-label">Total Casualties:</span>
                            <span className="stat-value">{selectedLocation.casualties}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Incidents:</span>
                            <span className="stat-value">{selectedLocation.incidentCount}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Intensity:</span>
                            <span className="stat-value">{(selectedLocation.intensity * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                    <button 
                        className="close-button"
                        onClick={() => setSelectedLocation(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Legend */}
            <div className="violence-3d-legend">
                <h4>3D Globe Legend</h4>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🗺️</span>
                    <span className="violence-3d-legend-text"><strong>Choropleth</strong> = Country Violence</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">📍</span>
                    <span className="violence-3d-legend-text"><strong>Points</strong> = Incident Locations</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🌊</span>
                    <span className="violence-3d-legend-text"><strong>Ripples</strong> = Click Effects</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🔵</span>
                    <span className="violence-3d-legend-text"><strong>Blue</strong> = Low Violence</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🔴</span>
                    <span className="violence-3d-legend-text"><strong>Red</strong> = High Violence</span>
                </div>
                <div className="violence-3d-controls-hint">
                    <div>🖱️ <strong>Click</strong> points for ripple effects</div>
                    <div>🔄 <strong>Switch:</strong> Use controls to return to 2D heatmap</div>
                </div>
            </div>
        </div>
    );
}

export default Violence3DGlobe;

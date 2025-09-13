/**
 * Main JavaScript for US Gun Incidents Visualization
 * Interactive map with time slider and heatmap/circle visualization modes
 */

// Global variables
let map;
let data = null;
let windows = [];
let currentWindowIndex = 0;
let isPlaying = false;
let playInterval = null;
let heatmapSource = null;
let circleSource = null;

// MapLibre access token (using Mapbox token for MapLibre compatibility)
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

// Initialize the application
async function init() {
    try {
        // Load data
        console.log('Loading data...');
        const response = await fetch('aggregates.json');
        data = await response.json();
        windows = data.meta.windows;

        console.log(`Loaded ${data.features.length} features across ${windows.length} windows`);

        // Initialize map
        initMap();

        // Setup controls
        setupSlider();
        setupControls();

        // Load initial data
        updateVisualization();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        document.getElementById('legend-content').textContent = 'Error loading data. Please check that aggregates.json exists.';
    }
}

// Initialize MapLibre map
function initMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [-98.5795, 39.8283], // Center of continental US
        zoom: 4,
        maxZoom: 12,
        minZoom: 3
    });

    map.on('load', () => {
        console.log('Map loaded');
        setupMapSources();
        setupMapLayers();
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
}

// Setup map data sources
function setupMapSources() {
    // Heatmap source
    heatmapSource = {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    };

    // Circle source (same data, different visualization)
    circleSource = {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    };

    map.addSource('heatmap-source', heatmapSource);
    map.addSource('circle-source', circleSource);
}

// Setup map layers
function setupMapLayers() {
    // Heatmap layer
    map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap-source',
        maxzoom: 12,
        paint: {
            'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'count'],
                0, 0,
                1, 1,
                100, 1
            ],
            'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.3,
                6, 0.8,
                12, 1.2
            ],
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0,0,255,0)',
                0.1, 'rgba(0,0,255,0.1)',
                0.3, 'rgba(0,255,255,0.3)',
                0.5, 'rgba(0,255,0,0.5)',
                0.7, 'rgba(255,255,0,0.7)',
                0.9, 'rgba(255,165,0,0.9)',
                1, 'rgba(255,0,0,1)'
            ],
            'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 2,
                6, 20,
                12, 40
            ],
            'heatmap-opacity': 0.8
        }
    });

    // Circle layer
    map.addLayer({
        id: 'circle-layer',
        type: 'circle',
        source: 'circle-source',
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['sqrt', ['get', 'count']],
                0, 0,
                1, 2,
                10, 8,
                100, 25,
                1000, 50
            ],
            'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'count'],
                0, '#0066cc',
                1, '#00ccff',
                10, '#00ff00',
                100, '#ffff00',
                1000, '#ff6600',
                10000, '#ff0000'
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(255,255,255,0.3)'
        }
    });

    // Initially hide circle layer
    map.setLayoutProperty('circle-layer', 'visibility', 'none');
}

// Setup time slider
function setupSlider() {
    const slider = document.getElementById('time-slider');
    const currentWindow = document.getElementById('current-window');

    slider.max = windows.length - 1;
    slider.value = 0;

    // Update display when slider changes
    slider.addEventListener('input', (e) => {
        currentWindowIndex = parseInt(e.target.value);
        updateWindowDisplay();
        updateVisualization();
    });

    // Initial display
    updateWindowDisplay();
}

// Update window display
function updateWindowDisplay() {
    const currentWindow = document.getElementById('current-window');
    const window = windows[currentWindowIndex];
    currentWindow.textContent = `${window.start}–${window.end}`;
}

// Setup other controls
function setupControls() {
    const heatmapCheckbox = document.getElementById('heatmap-mode');
    const playButton = document.getElementById('play-pause');

    // Heatmap mode toggle
    heatmapCheckbox.addEventListener('change', (e) => {
        const isHeatmap = e.target.checked;
        map.setLayoutProperty('heatmap-layer', 'visibility', isHeatmap ? 'visible' : 'none');
        map.setLayoutProperty('circle-layer', 'visibility', isHeatmap ? 'none' : 'visible');
    });

    // Play/pause button
    playButton.addEventListener('click', () => {
        if (isPlaying) {
            pauseAnimation();
        } else {
            playAnimation();
        }
    });
}

// Play animation
function playAnimation() {
    isPlaying = true;
    const playButton = document.getElementById('play-pause');
    playButton.textContent = '⏸ Pause';
    playButton.classList.add('playing');

    playInterval = setInterval(() => {
        currentWindowIndex = (currentWindowIndex + 1) % windows.length;
        document.getElementById('time-slider').value = currentWindowIndex;
        updateWindowDisplay();
        updateVisualization();
    }, 1500);
}

// Pause animation
function pauseAnimation() {
    isPlaying = false;
    const playButton = document.getElementById('play-pause');
    playButton.textContent = '▶ Play';
    playButton.classList.remove('playing');

    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
}

// Update visualization for current window
function updateVisualization() {
    if (!data || !map.isStyleLoaded()) return;

    const currentWindow = windows[currentWindowIndex];
    const featuresForWindow = data.features.filter(feature =>
        feature.w[0] === currentWindow.start && feature.w[1] === currentWindow.end
    );

    // Convert to GeoJSON
    const geoJsonFeatures = featuresForWindow.map(feature => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [feature.lon, feature.lat]
        },
        properties: {
            count: feature.n
        }
    }));

    const geoJsonData = {
        type: 'FeatureCollection',
        features: geoJsonFeatures
    };

    // Update sources
    map.getSource('heatmap-source').setData(geoJsonData);
    map.getSource('circle-source').setData(geoJsonData);

    // Update legend
    updateLegend(featuresForWindow);
}

// Update legend
function updateLegend(features) {
    const totalIncidents = features.reduce((sum, feature) => sum + feature.n, 0);
    const legendContent = document.getElementById('legend-content');

    legendContent.innerHTML = `
        <strong>${windows[currentWindowIndex].start}–${windows[currentWindowIndex].end}</strong> • 
        <strong>${totalIncidents.toLocaleString()}</strong> incidents
    `;
}

// Handle window resize
window.addEventListener('resize', () => {
    if (map) {
        map.resize();
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

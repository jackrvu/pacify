// Simple proxy server to handle CORS issues with geocoding API
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Proxy for OpenStreetMap Nominatim API
app.use('/api/nominatim', createProxyMiddleware({
    target: 'https://nominatim.openstreetmap.org',
    changeOrigin: true,
    pathRewrite: {
        '^/api/nominatim': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        // Add proper User-Agent header
        proxyReq.setHeader('User-Agent', 'Pacify-Gun-Violence-Visualization/1.0');
    }
}));

// Serve static files from public directory
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log('Nominatim API available at: http://localhost:3001/api/nominatim');
});

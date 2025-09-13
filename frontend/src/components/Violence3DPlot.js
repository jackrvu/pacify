// Violence3DPlot component - 3D surface visualization showing violence intensity
// Creates a smooth 3D surface with peaks and valleys using Canvas and WebGL

import React, { useRef, useEffect, useMemo } from 'react';
import './Violence3DPlot.css';

// 3D Surface Renderer using Canvas
function Violence3DSurface({ incidents, enabled = true }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    // Process incident data into a grid for 3D surface
    const surfaceData = useMemo(() => {
        if (!enabled || !incidents || incidents.length === 0) return null;

        // Create a grid for the surface (e.g., 50x50 points)
        const gridSize = 50;
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

        // Filter incidents with valid coordinates
        const validIncidents = incidents.filter(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        // Map incidents to grid positions
        validIncidents.forEach(incident => {
            const lat = parseFloat(incident.Latitude);
            const lng = parseFloat(incident.Longitude);
            const killed = parseInt(incident['Victims Killed'] || 0);
            const injured = parseInt(incident['Victims Injured'] || 0);
            const casualties = killed + injured;

            // Convert lat/lng to grid coordinates
            const gridX = Math.floor(((lng + 180) / 360) * gridSize);
            const gridY = Math.floor(((lat + 90) / 180) * gridSize);

            if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                grid[gridY][gridX] += casualties;
            }
        });

        // Apply smoothing to create continuous surface
        const smoothedGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        const smoothingRadius = 2;

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                let sum = 0;
                let count = 0;

                for (let dy = -smoothingRadius; dy <= smoothingRadius; dy++) {
                    for (let dx = -smoothingRadius; dx <= smoothingRadius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const weight = distance <= smoothingRadius ? 1 - (distance / smoothingRadius) : 0;
                            sum += grid[ny][nx] * weight;
                            count += weight;
                        }
                    }
                }

                smoothedGrid[y][x] = count > 0 ? sum / count : 0;
            }
        }

        return smoothedGrid;
    }, [incidents, enabled]);

    useEffect(() => {
        if (!surfaceData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        let rotationX = 0.3;
        let rotationY = 0;
        let zoom = 1;

        // 3D transformation functions
        function project3D(x, y, z) {
            const cosX = Math.cos(rotationX);
            const sinX = Math.sin(rotationX);
            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);

            // Rotate around X axis
            const y1 = y * cosX - z * sinX;
            const z1 = y * sinX + z * cosX;

            // Rotate around Y axis
            const x1 = x * cosY + z1 * sinY;
            const z2 = -x * sinY + z1 * cosY;

            // Project to 2D
            const scale = 200 * zoom;
            const centerX = canvas.width / 4;
            const centerY = canvas.height / 4;

            return {
                x: centerX + x1 * scale,
                y: centerY - y1 * scale,
                z: z2
            };
        }

        function drawSurface() {
            ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);

            const gridSize = surfaceData.length;
            const cellSize = 4;
            const maxHeight = 50;

            // Find max value for normalization
            const maxValue = Math.max(...surfaceData.flat());

            // Draw surface triangles
            for (let y = 0; y < gridSize - 1; y++) {
                for (let x = 0; x < gridSize - 1; x++) {
                    const x1 = (x - gridSize / 2) * cellSize;
                    const y1 = (y - gridSize / 2) * cellSize;
                    const x2 = x1 + cellSize;
                    const y2 = y1 + cellSize;

                    const z1 = (surfaceData[y][x] / maxValue) * maxHeight;
                    const z2 = (surfaceData[y][x + 1] / maxValue) * maxHeight;
                    const z3 = (surfaceData[y + 1][x] / maxValue) * maxHeight;
                    const z4 = (surfaceData[y + 1][x + 1] / maxValue) * maxHeight;

                    // Project points to 2D
                    const p1 = project3D(x1, y1, z1);
                    const p2 = project3D(x2, y1, z2);
                    const p3 = project3D(x1, y2, z3);
                    const p4 = project3D(x2, y2, z4);

                    // Calculate color based on height
                    const avgHeight = (z1 + z2 + z3 + z4) / 4;
                    const intensity = avgHeight / maxHeight;

                    // Color gradient: blue (low) -> green -> yellow -> red (high)
                    let color;
                    if (intensity < 0.25) {
                        color = `rgb(${Math.floor(0 + intensity * 4 * 100)}, ${Math.floor(0 + intensity * 4 * 100)}, 255)`;
                    } else if (intensity < 0.5) {
                        const t = (intensity - 0.25) * 4;
                        color = `rgb(${Math.floor(100 + t * 155)}, 255, ${Math.floor(255 - t * 255)})`;
                    } else if (intensity < 0.75) {
                        const t = (intensity - 0.5) * 4;
                        color = `rgb(255, ${Math.floor(255 - t * 100)}, 0)`;
                    } else {
                        const t = (intensity - 0.75) * 4;
                        color = `rgb(255, ${Math.floor(155 - t * 155)}, ${Math.floor(0 + t * 100)})`;
                    }

                    // Draw two triangles for each quad
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.lineTo(p4.x, p4.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Draw wireframe
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 0.5;

            for (let y = 0; y < gridSize; y += 2) {
                for (let x = 0; x < gridSize; x += 2) {
                    const x1 = (x - gridSize / 2) * cellSize;
                    const y1 = (y - gridSize / 2) * cellSize;
                    const z1 = (surfaceData[y][x] / maxValue) * maxHeight;

                    const p1 = project3D(x1, y1, z1);

                    if (x < gridSize - 1) {
                        const x2 = x1 + cellSize * 2;
                        const z2 = (surfaceData[y][x + 1] / maxValue) * maxHeight;
                        const p2 = project3D(x2, y1, z2);

                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }

                    if (y < gridSize - 1) {
                        const y2 = y1 + cellSize * 2;
                        const z2 = (surfaceData[y + 1][x] / maxValue) * maxHeight;
                        const p2 = project3D(x1, y2, z2);

                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Animation loop
        function animate() {
            rotationY += 0.005;
            drawSurface();
            animationRef.current = requestAnimationFrame(animate);
        }

        drawSurface();
        animate();

        // Mouse controls
        let isMouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;

        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                const deltaX = e.clientX - lastMouseX;
                const deltaY = e.clientY - lastMouseY;

                rotationY += deltaX * 0.01;
                rotationX += deltaY * 0.01;

                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            zoom += e.deltaY * -0.001;
            zoom = Math.max(0.5, Math.min(2, zoom));
        });

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [surfaceData]);

    if (!surfaceData) {
        return (
            <div className="violence-3d-loading">
                <div className="violence-3d-loading-spinner"></div>
                <div>Loading 3D surface...</div>
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className="violence-3d-canvas"
            style={{ width: '100%', height: '100%' }}
        />
    );
}

// Main 3D plot component
function Violence3DPlot({ incidents, enabled = true }) {
    if (!enabled) {
        return null;
    }

    return (
        <div className="violence-3d-container">
            {/* Title */}
            <div className="violence-3d-title">
                <h2>3D Violence Surface Visualization</h2>
                <p>Surface height = Violence intensity</p>
            </div>

            {/* 3D Surface Canvas */}
            <Violence3DSurface incidents={incidents} enabled={enabled} />

            {/* Legend */}
            <div className="violence-3d-legend">
                <h4>3D Surface Legend</h4>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🏔️</span>
                    <span className="violence-3d-legend-text"><strong>Surface Height</strong> = Violence Intensity</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🔵</span>
                    <span className="violence-3d-legend-text"><strong>Blue</strong> = Low Violence</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🟢</span>
                    <span className="violence-3d-legend-text"><strong>Green</strong> = Medium Violence</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🟡</span>
                    <span className="violence-3d-legend-text"><strong>Yellow</strong> = High Violence</span>
                </div>
                <div className="violence-3d-legend-item">
                    <span className="violence-3d-legend-icon">🔴</span>
                    <span className="violence-3d-legend-text"><strong>Red</strong> = Extreme Violence</span>
                </div>
                <div className="violence-3d-controls-hint">
                    <div>🖱️ <strong>Mouse:</strong> Drag to rotate, scroll to zoom</div>
                    <div>🔄 <strong>Switch:</strong> Use controls to return to heatmap</div>
                </div>
            </div>
        </div>
    );
}

export default Violence3DPlot;

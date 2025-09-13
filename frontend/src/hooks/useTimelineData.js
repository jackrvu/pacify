// Custom hook for loading and managing gun violence incident data across multiple datasets
// Handles data from 1985-2018 (historical), 2019-2025 (recent), and 2025 (current)
// Normalizes different data formats and provides year-based filtering
import { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';

const useTimelineData = () => {
    const [allData, setAllData] = useState([]); // Combined normalized data from all sources
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load and normalize all datasets
    useEffect(() => {
        const loadTimelineData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load all three datasets (now with county information)
                const [historicalResponse, recentResponse, currentResponse] = await Promise.all([
                    fetch('/data/US_gun_deaths_1985-2018_with_coordinates_with_counties.csv'),
                    fetch('/data/gun_incidents_2019-2025_incident_level.csv'), // This one was updated in place
                    fetch('/data/2025_with_locations_with_counties.csv')
                ]);

                const [historicalText, recentText, currentText] = await Promise.all([
                    historicalResponse.text(),
                    recentResponse.text(),
                    currentResponse.text()
                ]);

                // Parse all datasets
                const parseDataset = (csvText) => {
                    return new Promise((resolve) => {
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results) => resolve(results.data),
                            error: (error) => {
                                console.error('Parse error:', error);
                                resolve([]);
                            }
                        });
                    });
                };

                const [historicalData, recentData, currentData] = await Promise.all([
                    parseDataset(historicalText),
                    parseDataset(recentText),
                    parseDataset(currentText)
                ]);

                // Normalize data formats
                const normalizeHistoricalData = (data) => {
                    return data.map(item => ({
                        id: item.incident_id || `hist_${Math.random()}`,
                        year: parseInt(item.year),
                        month: parseInt(item.month),
                        latitude: parseFloat(item.Latitude),
                        longitude: parseFloat(item.Longitude),
                        casualties: 1, // Historical data is per victim
                        killed: 1,
                        injured: 0,
                        state: item.state,
                        source: 'historical',
                        originalData: item
                    })).filter(item =>
                        !isNaN(item.year) &&
                        !isNaN(item.latitude) &&
                        !isNaN(item.longitude) &&
                        item.latitude !== 0 &&
                        item.longitude !== 0
                    );
                };

                const normalizeRecentData = (data) => {
                    return data.map(item => {
                        const killed = parseInt(item['Victims Killed'] || 0);
                        const injured = parseInt(item['Victims Injured'] || 0);

                        return {
                            id: item['Incident ID'],
                            year: parseInt(item.year),
                            month: item['Incident Date'] ? new Date(item['Incident Date']).getMonth() + 1 : null,
                            latitude: parseFloat(item.Latitude) || null,
                            longitude: parseFloat(item.Longitude) || null,
                            casualties: killed + injured,
                            killed: killed,
                            injured: injured,
                            state: item.State,
                            city: item['City Or County'],
                            county: item.County_Name || '',
                            countyState: item.County_State || '',
                            address: item.Coordinate_Display || item.Address,
                            googleMapsLink: item.Google_Maps_Link,
                            source: 'recent',
                            originalData: item
                        };
                    }).filter(item =>
                        !isNaN(item.year) &&
                        item.casualties > 0
                    );
                };

                const normalizeCurrentData = (data) => {
                    return data.map(item => {
                        const killed = parseInt(item['Victims Killed'] || 0);
                        const injured = parseInt(item['Victims Injured'] || 0);

                        return {
                            id: item['Incident ID'],
                            year: 2025, // Current data is 2025
                            month: item['Incident Date'] ? new Date(item['Incident Date']).getMonth() + 1 : null,
                            latitude: parseFloat(item.Latitude),
                            longitude: parseFloat(item.Longitude),
                            casualties: killed + injured,
                            killed: killed,
                            injured: injured,
                            state: item.State,
                            city: item['City Or County'],
                            county: item.County_Name || '',
                            countyState: item.County_State || '',
                            address: item.Coordinate_Display || item.Address,
                            googleMapsLink: item.Google_Maps_Link,
                            source: 'current',
                            originalData: item
                        };
                    }).filter(item =>
                        !isNaN(item.latitude) &&
                        !isNaN(item.longitude) &&
                        item.latitude !== 0 &&
                        item.longitude !== 0 &&
                        item.casualties > 0
                    );
                };

                // Normalize all datasets
                const normalizedHistorical = normalizeHistoricalData(historicalData);
                const normalizedRecent = normalizeRecentData(recentData);
                const normalizedCurrent = normalizeCurrentData(currentData);

                // Combine all data
                const combinedData = [
                    ...normalizedHistorical,
                    ...normalizedRecent,
                    ...normalizedCurrent
                ];

                console.log('Timeline data loaded:', {
                    historical: normalizedHistorical.length,
                    recent: normalizedRecent.length,
                    current: normalizedCurrent.length,
                    total: combinedData.length
                });

                setAllData(combinedData);
                setLoading(false);

            } catch (err) {
                console.error('Error loading timeline data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadTimelineData();
    }, []);

    // Extract available years from data
    const availableYears = useMemo(() => {
        if (allData.length === 0) return [];

        const years = [...new Set(allData.map(item => item.year))];
        return years.sort((a, b) => a - b);
    }, [allData]);

    // Filter data by year
    const getDataForYear = useCallback((year) => {
        if (year === 'all') return allData;
        return allData.filter(item => item.year === year);
    }, [allData]);

    // Get year range
    const yearRange = useMemo(() => {
        if (availableYears.length === 0) return { min: 2025, max: 2025 };
        return {
            min: Math.min(...availableYears),
            max: Math.max(...availableYears)
        };
    }, [availableYears]);

    // Get statistics
    const getYearStats = useCallback((year) => {
        const yearData = getDataForYear(year);
        return {
            totalIncidents: yearData.length,
            totalKilled: yearData.reduce((sum, item) => sum + item.killed, 0),
            totalInjured: yearData.reduce((sum, item) => sum + item.injured, 0),
            totalCasualties: yearData.reduce((sum, item) => sum + item.casualties, 0)
        };
    }, [getDataForYear]);

    return {
        allData,
        loading,
        error,
        availableYears,
        yearRange,
        getDataForYear,
        getYearStats
    };
};

export default useTimelineData;

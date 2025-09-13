#!/usr/bin/env python3
"""
Tests for the preprocessing pipeline.
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

# Add parent directory to path to import preprocess
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocess import detect_columns, parse_date_column, create_time_windows, aggregate_incidents


class TestPreprocess(unittest.TestCase):
    
    def setUp(self):
        """Set up test data."""
        # Create synthetic test data
        self.test_data = pd.DataFrame({
            'year': [1995, 1995, 1996, 1996, 1998, 1998, 2000, 2000, 2002, 2002],
            'Latitude': [40.7128, 40.7589, 34.0522, 34.0522, 29.7604, 29.7604, 41.8781, 41.8781, 25.7617, 25.7617],
            'Longitude': [-74.0060, -73.9851, -118.2437, -118.2437, -95.3698, -95.3698, -87.6298, -87.6298, -80.1918, -80.1918],
            'state': ['NY', 'NY', 'CA', 'CA', 'TX', 'TX', 'IL', 'IL', 'FL', 'FL']
        })
        
        # Create temporary directory for test outputs
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test files."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_detect_columns(self):
        """Test column detection."""
        lat_col, lon_col, date_col = detect_columns(self.test_data)
        self.assertEqual(lat_col, 'Latitude')
        self.assertEqual(lon_col, 'Longitude')
        self.assertEqual(date_col, 'year')
    
    def test_parse_date_column(self):
        """Test date parsing."""
        parsed_dates = parse_date_column(self.test_data, 'year')
        self.assertEqual(len(parsed_dates), 10)
        self.assertTrue(all(parsed_dates.dt.year == self.test_data['year']))
        self.assertTrue(all(parsed_dates.dt.month == 7))  # July 1st
    
    def test_create_time_windows(self):
        """Test time window creation."""
        windows = create_time_windows(1995, 2002, 3)
        expected = [
            {"start": 1995, "end": 1997},
            {"start": 1998, "end": 2000},
            {"start": 2001, "end": 2002}
        ]
        self.assertEqual(windows, expected)
    
    def test_aggregate_incidents_bin(self):
        """Test aggregation with bin grid."""
        # Parse dates
        self.test_data['parsed_date'] = parse_date_column(self.test_data, 'year')
        
        # Create windows
        windows = create_time_windows(1995, 2002, 3)
        
        # Aggregate
        features = aggregate_incidents(
            self.test_data, 'Latitude', 'Longitude', windows, 
            grid_type="bin", bin_size=0.1, conus_only=False
        )
        
        # Check that we have features
        self.assertGreater(len(features), 0)
        
        # Check feature structure
        for feature in features:
            self.assertIn('w', feature)
            self.assertIn('lat', feature)
            self.assertIn('lon', feature)
            self.assertIn('n', feature)
            self.assertIn('bin_id', feature)
            self.assertIsInstance(feature['w'], list)
            self.assertEqual(len(feature['w']), 2)
            self.assertIsInstance(feature['n'], int)
    
    def test_aggregate_incidents_h3(self):
        """Test aggregation with H3 grid (if available)."""
        try:
            import h3
        except ImportError:
            self.skipTest("H3 not available")
        
        # Parse dates
        self.test_data['parsed_date'] = parse_date_column(self.test_data, 'year')
        
        # Create windows
        windows = create_time_windows(1995, 2002, 3)
        
        # Aggregate
        features = aggregate_incidents(
            self.test_data, 'Latitude', 'Longitude', windows, 
            grid_type="h3", h3_resolution=6, conus_only=False
        )
        
        # Check that we have features
        self.assertGreater(len(features), 0)
        
        # Check feature structure
        for feature in features:
            self.assertIn('w', feature)
            self.assertIn('lat', feature)
            self.assertIn('lon', feature)
            self.assertIn('n', feature)
            self.assertIn('c', feature)
            self.assertIsInstance(feature['w'], list)
            self.assertEqual(len(feature['w']), 2)
            self.assertIsInstance(feature['n'], int)
    
    def test_conus_filtering(self):
        """Test CONUS filtering."""
        # Add some non-CONUS data
        non_conus_data = pd.DataFrame({
            'year': [1995, 1995],
            'Latitude': [21.3099, 61.2181],  # Hawaii, Alaska
            'Longitude': [-157.8581, -149.9003],
            'state': ['HI', 'AK']
        })
        
        combined_data = pd.concat([self.test_data, non_conus_data])
        combined_data['parsed_date'] = parse_date_column(combined_data, 'year')
        
        windows = create_time_windows(1995, 1995, 1)
        
        # Test without CONUS filter
        features_all = aggregate_incidents(
            combined_data, 'Latitude', 'Longitude', windows, 
            grid_type="bin", conus_only=False
        )
        
        # Test with CONUS filter
        features_conus = aggregate_incidents(
            combined_data, 'Latitude', 'Longitude', windows, 
            grid_type="bin", conus_only=True
        )
        
        # CONUS should have fewer features
        self.assertLess(len(features_conus), len(features_all))


if __name__ == '__main__':
    unittest.main()

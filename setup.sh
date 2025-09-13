#!/bin/bash

# Setup script for US Gun Incidents Visualization

echo "Setting up US Gun Incidents Visualization..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run preprocessing
echo "Preprocessing data..."
python preprocess.py \
  --csv "data/US_gun_deaths_1985-2018_with_coordinates.csv" \
  --out dist/aggregates.json \
  --grid h3 --h3-res 6 \
  --years-per-window 3 \
  --conus-only

# Copy data to web directory
echo "Copying data to web directory..."
cp dist/aggregates.json web/

# Run tests
echo "Running tests..."
python tests/test_preprocess.py

echo "Setup complete!"
echo ""
echo "To start the visualization:"
echo "  cd web"
echo "  python -m http.server 8000"
echo "  Then open http://localhost:8000 in your browser"

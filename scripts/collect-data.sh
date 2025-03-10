#!/bin/bash
# Simple script to collect API metrics from tt-metal repository

set -e  # Exit on any error

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Get the absolute path of this script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DASHBOARD_DIR="$(dirname "$SCRIPT_DIR")"

# Clone tt-metal repository
echo "Cloning tt-metal repository..."
git clone https://github.com/tenstorrent/tt-metal.git $TEMP_DIR/tt-metal
cd $TEMP_DIR/tt-metal

# Copy the data collection scripts
echo "Copying data collection scripts..."
cp $SCRIPT_DIR/collect_metrics.sh .
cp $SCRIPT_DIR/compute_public_api_surface.py .

# Install dependencies if needed
echo "Checking for dependencies..."
if ! pip show tree-sitter >/dev/null 2>&1 || ! pip show tree-sitter-cpp >/dev/null 2>&1; then
    echo "Installing Python dependencies..."
    pip install tree-sitter tree-sitter-cpp
fi

# Run the data collection script
echo "Running data collection script..."
chmod +x collect_metrics.sh
./collect_metrics.sh

# Copy the results to the dashboard
echo "Copying results to dashboard..."
mkdir -p $DASHBOARD_DIR/public/data
cp timeseries.csv $DASHBOARD_DIR/public/data/

# Clean up
echo "Cleaning up temporary directory..."
cd $DASHBOARD_DIR
rm -rf $TEMP_DIR

echo "Data collection complete! The metrics data has been updated in public/data/timeseries.csv" 
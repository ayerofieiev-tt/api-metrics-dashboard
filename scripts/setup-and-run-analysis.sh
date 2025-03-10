#!/bin/bash
# setup-and-run-analysis.sh - Script that sets up the environment, runs metrics collection, and updates the dashboard

set -e  # Exit on any error

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Get the absolute path of this script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DASHBOARD_DIR="$(dirname "$SCRIPT_DIR")"

# Check for jq dependency
if ! command -v jq &> /dev/null; then
    echo "jq not found. Please install it using your package manager:"
    echo "  - macOS: 'brew install jq'"
    echo "  - Ubuntu/Debian: 'sudo apt-get install jq'"
    echo "  - Fedora: 'sudo dnf install jq'"
    exit 1
fi

# Clone tt-metal repository
echo "Cloning tt-metal repository..."
git clone https://github.com/tenstorrent/tt-metal.git $TEMP_DIR/tt-metal
cd $TEMP_DIR/tt-metal

# Copy the data collection scripts
echo "Copying data collection scripts..."
cp $SCRIPT_DIR/build-api-metrics-timeseries.sh .
cp $SCRIPT_DIR/analyze_cpp_api.py .

# Create and activate a virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv $TEMP_DIR/venv
source $TEMP_DIR/venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
python -m pip install --upgrade pip
python -m pip install tree-sitter tree-sitter-cpp

# Run the data collection script
echo "Running time series data collection script..."
chmod +x build-api-metrics-timeseries.sh
./build-api-metrics-timeseries.sh

# Copy the results to the dashboard
echo "Copying results to dashboard..."
mkdir -p $DASHBOARD_DIR/public/data
cp timeseries.csv $DASHBOARD_DIR/public/data/

# Deactivate virtual environment
deactivate

# Clean up
echo "Cleaning up temporary directory..."
cd $DASHBOARD_DIR
rm -rf $TEMP_DIR

echo "Data collection complete! The metrics data has been updated in public/data/timeseries.csv" 
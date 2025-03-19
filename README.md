# API Metrics Dashboard

Dashboard tracking TT-Metal API changes to help create a cleaner API.

## Links

- **Live Dashboard:** [https://ayerofieiev-tt.github.io/api-metrics-dashboard/](https://ayerofieiev-tt.github.io/api-metrics-dashboard/)
- **Source Code:** [https://github.com/ayerofieiev-tt/api-metrics-dashboard](https://github.com/ayerofieiev-tt/api-metrics-dashboard)

## Features

- Tracks API files, types, methods, and lines of code over time
- Identifies significant changes automatically
- Shows correlations between metrics
- Monitors code density (lines per method)
- Header Leaderboard showing top API headers by various metrics
- Interactive code viewer with syntax highlighting for C++ files
- Automatic highlighting of code regions (types, methods, implementations)

## Setup

### Prerequisites

- Node.js (v14+)
- npm (v6+)

### Install and Run

```bash
# Clone repo
git clone https://github.com/ayerofieiev-tt/api-metrics-dashboard.git
cd api-metrics-dashboard

# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Collection

### Automatic Updates

- A GitHub workflow runs daily at midnight to collect metrics from tt-metal
- Updates happen automatically when pushed to main branch
- Manual workflow runs can be triggered from GitHub Actions tab

### Manual Data Collection

The simplest way to collect data manually:

```bash
# Run the setup and analysis script from the repo root
./scripts/setup-and-run-analysis.sh
```

This script will:
1. Clone the tt-metal repository to a temporary directory
2. Install required dependencies
3. Run the metrics collection process
4. Update the data file in your local copy
5. Clean up temporary files

### Scripts Overview

The data collection system consists of three main components:

1. **setup-and-run-analysis.sh** - Main wrapper script that:
   - Sets up the environment (clones repo, installs dependencies)
   - Runs the time series data collection
   - Updates the dashboard with new data

2. **build-api-metrics-timeseries.sh** - Creates historical time series data by:
   - Going through git history day by day
   - Analyzing API metrics at each point in time
   - Building a CSV of metrics over time

3. **analyze_cpp_api.py** - Python script that:
   - Analyzes C++ header files using tree-sitter
   - Counts files, types, methods, and lines
   - Outputs metrics for a single point in time

The dashboard uses Python scripts to collect data from the C++ API code:

1. **analyze_cpp_headers.py** - Parses C++ headers and extracts metrics daily
2. **analyze_cpp_header_leaderboard.py** - Analyzes headers to create leaderboard data

## Header Leaderboard

The Header Leaderboard feature allows you to:

- View top API headers by different metrics (lines of code, methods, types, implementation in headers)
- Examine header file content with syntax highlighting
- Automatically highlight different code regions:
  - Types (classes, structs, enums)
  - Methods (function declarations)
  - Implementations (function bodies in headers)

This helps identify headers that might need refactoring or cleanup based on various metrics.

## Deployment

```bash
# Deploy to GitHub Pages
npm run deploy
```

Changes to main branch automatically deploy to GitHub Pages.
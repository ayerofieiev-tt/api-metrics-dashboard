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
# Run the collection script from the repo root
./scripts/collect-data.sh
```

This script will:
1. Clone the tt-metal repository to a temporary directory
2. Install required dependencies
3. Run the metrics collection process
4. Update the data file in your local copy
5. Clean up temporary files

## Deployment

```bash
# Deploy to GitHub Pages
npm run deploy
```

Changes to main branch automatically deploy to GitHub Pages.
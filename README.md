# API Metrics Dashboard

This dashboard provides insights into TT-Metal API's changes, helping monitor our progress towards a lean and clean API.

## Live

Check out the live dashboard: [API Metrics Dashboard](https://ayerofieiev-tt.github.io/api-metrics-dashboard/)

## What's there

- **Metrics Tracking**: Monitor files, types, methods, and lines of code over time
- **Change Detection**: Automatically identifies significant changes in your API surface
- **Correlation Analysis**: Visualizes relationships between different metrics
- **Code Density Insights**: Tracks code density (lines per method) to monitor code complexity

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/ayerofieiev-tt/api-metrics-dashboard.git
   cd api-metrics-dashboard
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the dashboard in your browser.

## Deployment

### GitHub Pages

This project is configured for easy deployment to GitHub Pages:

1. Install the gh-pages package if not already installed:
   ```
   npm install --save-dev gh-pages
   ```

2. Deploy to GitHub Pages:
   ```
   npm run deploy
   ```

### Automatic Deployment

This project has automatic deployment enabled:

- Changes pushed to the main branch will automatically trigger a deployment to GitHub Pages
- No manual deployment steps are required for updates to the main branch
- The live dashboard is automatically updated with the latest changes

## Customizing Data

The dashboard currently uses sample data embedded in the code. To use your own API metrics:

1. Open `src/APIMetricsDashboard.js`
2. Locate the `csvData` variable in the `useEffect` hook
3. Replace the sample data with your own CSV-formatted metrics data
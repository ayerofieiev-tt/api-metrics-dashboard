import React from 'react';
import APIMetricsDashboard from './APIMetricsDashboard';

const App = () => {
  // Add a hidden build version that will force React to re-render when changed
  const buildTime = process.env.REACT_APP_BUILD_TIME || new Date().getTime();
  
  return (
    <div className="app-container h-screen bg-gray-100" key={buildTime}>
      <header className="text-white p-4 shadow-md" style={{ backgroundColor: "#7c68fa" }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">TT-Metalium API Metrics Tracker</h1>
          <div id="last-updated-container" className="text-sm">
            {/* Last updated info will be injected by APIMetricsDashboard */}
          </div>
        </div>
      </header>
      
      <main className="pt-2 flex-1 overflow-hidden">
        <APIMetricsDashboard />
      </main>
      
      <footer className="bg-gray-800 text-white p-4">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>© 2025 TT-Metalium API Metrics Tracker. All rights reserved.</p>
          {/* Add a hidden span with build time to force cache invalidation */}
          <span className="hidden">{buildTime}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
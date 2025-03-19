import React from 'react';
import APIMetricsDashboard from './APIMetricsDashboard';

const App = () => {
  // Add a hidden build version that will force React to re-render when changed
  const buildTime = process.env.REACT_APP_BUILD_TIME || new Date().getTime();
  
  return (
    <div className="app-container h-screen bg-gray-100" key={buildTime}>
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">API Metrics Tracker</h1>
        </div>
      </header>
      
      <main className="py-6 flex-1 overflow-hidden">
        <APIMetricsDashboard />
      </main>
      
      <footer className="bg-gray-800 text-white p-4">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>© 2025 API Metrics Tracker. All rights reserved.</p>
          {/* Add a hidden span with build time to force cache invalidation */}
          <span className="hidden">{buildTime}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
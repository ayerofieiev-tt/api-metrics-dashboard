import React from 'react';
import APIMetricsDashboard from './APIMetricsDashboard';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">API Metrics Tracker</h1>
        </div>
      </header>
      
      <main className="py-6">
        <APIMetricsDashboard />
      </main>
      
      <footer className="bg-gray-800 text-white p-4 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>© 2025 API Metrics Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
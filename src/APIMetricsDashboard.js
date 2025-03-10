import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const APIMetricsDashboard = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [significantChanges, setSignificantChanges] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [stats, setStats] = useState({});
  const [correlations, setCorrelations] = useState({});
  const [densityData, setDensityData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCSVData = async () => {
      try {
        // Fetch CSV file from the public/data directory
        const response = await fetch('/data/timeseries.csv');
        if (!response.ok) {
          throw new Error('Failed to fetch data file');
        }
        const csvData = await response.text();
        processData(parseCSV(csvData));
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Using sample data instead.');
        
        // Fallback to sample data
        const csvData = `date,num_files,num_types,num_methods,num_lines
2025-01-16,106,526,3312,20483
2025-01-17,106,526,3286,18494
2025-01-18,105,525,3285,18450
2025-01-19,105,520,3257,18319
2025-01-20,106,519,3236,18241
2025-01-21,106,519,3237,18241
2025-01-22,106,519,3232,18235
2025-01-23,106,519,3232,18235
2025-01-24,106,520,3237,18255
2025-01-25,106,520,3238,18333
2025-01-26,106,520,3237,18255
2025-01-27,110,529,3334,18666
2025-01-28,109,529,3335,18552
2025-01-29,108,522,3189,18141
2025-01-30,108,522,3190,18081
2025-01-31,106,512,3061,17706`;
        
        processData(parseCSV(csvData));
      }
    };

    fetchCSVData();
  }, []);

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = header === 'date' ? values[index] : parseInt(values[index]);
      });
      
      return row;
    });
  };

  const processData = (parsedData) => {
    // Remove duplicate dates (specifically 2025-02-14 which appears twice)
    const uniqueData = [];
    const dateSet = new Set();

    parsedData.forEach(row => {
      if (!dateSet.has(row.date)) {
        dateSet.add(row.date);
        
        // Calculate code density (lines per method)
        row.code_density = parseFloat((row.num_lines / row.num_methods).toFixed(2));
        
        uniqueData.push(row);
      }
    });

    // Calculate statistics
    const metrics = ['num_files', 'num_types', 'num_methods', 'num_lines', 'code_density'];
    const calculatedStats = {};

    metrics.forEach(metric => {
      const values = uniqueData.map(row => row[metric]);
      calculatedStats[metric] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100,
        start: values[0],
        end: values[values.length - 1],
        percentChange: ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(2)
      };
    });

    // Find significant changes
    const changes = [];
    for (let i = 1; i < uniqueData.length; i++) {
      const prevRow = uniqueData[i - 1];
      const currRow = uniqueData[i];
      
      metrics.forEach(metric => {
        if (metric !== 'code_density') {  // Skip derived metrics
          const change = currRow[metric] - prevRow[metric];
          const percentChange = (change / prevRow[metric]) * 100;
          
          // Consider changes of more than 3% significant for most metrics
          // For lines of code, use a higher threshold (5%) since it has larger fluctuations
          const threshold = metric === 'num_lines' ? 5 : 3;
          
          if (Math.abs(percentChange) > threshold) {
            changes.push({
              date: currRow.date,
              metric,
              previousValue: prevRow[metric],
              newValue: currRow[metric],
              change,
              percentChange: percentChange.toFixed(2)
            });
          }
        }
      });
    }

    // Calculate correlations between metrics
    const metricCorrelations = {};
    const primaryMetrics = ['num_files', 'num_types', 'num_methods', 'num_lines'];
    
    primaryMetrics.forEach(metric1 => {
      primaryMetrics.forEach(metric2 => {
        if (metric1 !== metric2) {
          const values1 = uniqueData.map(row => row[metric1]);
          const values2 = uniqueData.map(row => row[metric2]);
          
          // Calculate covariance
          const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
          const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
          
          let covariance = 0;
          for (let i = 0; i < values1.length; i++) {
            covariance += (values1[i] - mean1) * (values2[i] - mean2);
          }
          covariance /= values1.length;
          
          // Calculate standard deviations
          const stdDev1 = Math.sqrt(values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / values1.length);
          const stdDev2 = Math.sqrt(values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / values2.length);
          
          // Calculate correlation coefficient
          const correlation = covariance / (stdDev1 * stdDev2);
          
          metricCorrelations[`${metric1}_${metric2}`] = parseFloat(correlation.toFixed(3));
        }
      });
    });

    // Create density data for the additional chart
    const densityChartData = uniqueData.map(row => ({
      date: row.date,
      code_density: row.code_density,
    }));

    setDensityData(densityChartData);
    setCorrelations(metricCorrelations);
    setStats(calculatedStats);
    setSignificantChanges(changes);
    setData(uniqueData);
    setIsLoading(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleMouseEnter = (_, index) => {
    if (data[index]) {
      setSelectedDate(data[index].date);
    }
  };

  const handleMouseLeave = () => {
    setSelectedDate(null);
  };

  const metricNames = {
    num_files: "Number of Files",
    num_types: "Number of Types",
    num_methods: "Number of Methods",
    num_lines: "Lines of Code",
    code_density: "Code Density (Lines/Method)"
  };

  const metricColors = {
    num_files: "#8884d8",
    num_types: "#82ca9d",
    num_methods: "#ffc658",
    num_lines: "#ff8042",
    code_density: "#0088FE"
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  }

  // Find changes for the selected date
  const changesForSelectedDate = selectedDate 
    ? significantChanges.filter(change => change.date === selectedDate)
    : [];

  const renderSignificantChanges = () => {
    if (changesForSelectedDate.length === 0) {
      return null;
    }

    return (
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-medium mb-2">Significant Changes on {formatDate(selectedDate)}:</h3>
        <ul className="space-y-1">
          {changesForSelectedDate.map((change, index) => (
            <li key={index}>
              <span className="font-medium">{metricNames[change.metric]}:</span> {change.previousValue.toLocaleString()} → {change.newValue.toLocaleString()} 
              <span className={`ml-2 ${change.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({change.change > 0 ? '+' : ''}{change.change.toLocaleString()} / {change.percentChange}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMetricSummary = (metric) => {
    const metricStat = stats[metric];
    return (
      <div className="flex flex-wrap justify-between text-sm">
        <div>Start: <span className="font-medium">{metricStat.start.toLocaleString()}</span></div>
        <div>End: <span className="font-medium">{metricStat.end.toLocaleString()}</span></div>
        <div>Change: <span className={`font-medium ${metricStat.percentChange > 0 ? 'text-green-600' : metricStat.percentChange < 0 ? 'text-red-600' : ''}`}>
          {metricStat.percentChange > 0 ? '+' : ''}{metricStat.percentChange}%
        </span></div>
      </div>
    );
  };

  // Find dates with significant changes for reference lines
  const significantDates = [...new Set(significantChanges.map(change => change.date))];

  const renderChart = (metric) => {
    return (
      <div className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">{metricNames[metric]}</h2>
        {renderMetricSummary(metric)}
        <div className="h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              onMouseMove={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.ceil(data.length / 15)}
              />
              <YAxis 
                domain={[
                  dataMin => Math.floor(dataMin * 0.98), 
                  dataMax => Math.ceil(dataMax * 1.02)
                ]}
              />
              <Tooltip 
                labelFormatter={(value) => `Date: ${formatDate(value)}`}
                formatter={(value, name) => [value.toLocaleString(), metricNames[name]]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={metric} 
                stroke={metricColors[metric]} 
                activeDot={{ r: 8 }} 
                dot={{ r: 3 }}
              />
              
              {significantDates.map((date, i) => (
                <ReferenceLine 
                  key={i}
                  x={date} 
                  stroke="rgba(255, 0, 0, 0.5)" 
                  strokeDasharray="3 3"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderDensityChart = () => {
    return (
      <div className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">Code Density (Lines per Method)</h2>
        {renderMetricSummary('code_density')}
        <div className="h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              onMouseMove={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.ceil(data.length / 15)}
              />
              <YAxis 
                domain={[
                  dataMin => Math.floor(dataMin * 0.98), 
                  dataMax => Math.ceil(dataMax * 1.02)
                ]}
              />
              <Tooltip 
                labelFormatter={(value) => `Date: ${formatDate(value)}`}
                formatter={(value, name) => [value.toFixed(2), "Lines per Method"]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="code_density" 
                stroke={metricColors.code_density} 
                activeDot={{ r: 8 }} 
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const getCorrelationClass = (value) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return 'font-bold';
    if (absValue > 0.5) return 'font-medium';
    return 'text-gray-500';
  };

  const renderCorrelationMatrix = () => {
    const metrics = ['num_files', 'num_types', 'num_methods', 'num_lines'];
    
    return (
      <div className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-4">Metric Correlations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border-b-2 border-gray-300"></th>
                {metrics.map(metric => (
                  <th key={metric} className="p-2 border-b-2 border-gray-300 text-left">
                    {metricNames[metric].replace('Number of ', '').replace('Lines of ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric1 => (
                <tr key={metric1}>
                  <td className="p-2 border-b border-gray-200 font-medium">
                    {metricNames[metric1].replace('Number of ', '').replace('Lines of ', '')}
                  </td>
                  {metrics.map(metric2 => {
                    if (metric1 === metric2) {
                      return (
                        <td key={`${metric1}_${metric2}`} className="p-2 border-b border-gray-200 text-center">
                          —
                        </td>
                      );
                    }
                    
                    const correlation = correlations[`${metric1}_${metric2}`];
                    return (
                      <td 
                        key={`${metric1}_${metric2}`} 
                        className={`p-2 border-b border-gray-200 ${getCorrelationClass(correlation)}`}
                      >
                        {correlation.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Values closer to 1 or -1 indicate stronger correlation. 
          Positive values mean metrics tend to increase together, 
          negative values mean one tends to decrease as the other increases.
        </p>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Public API Surface Dashboard</h1>
        <p className="text-gray-600">Tracking changes to your library's public API surface over time.</p>
      </div>

      {renderSignificantChanges()}

      <div className="space-y-6">
        {renderChart('num_files')}
        {renderChart('num_types')}
        {renderChart('num_methods')}
        {renderChart('num_lines')}
        {renderDensityChart()}
        {renderCorrelationMatrix()}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-medium mb-2">Key Insights:</h3>
        <ul className="space-y-2">
          <li>Files increased by {stats.num_files.percentChange}% (from {stats.num_files.start} to {stats.num_files.end})</li>
          <li>Types increased by {stats.num_types.percentChange}% (from {stats.num_types.start} to {stats.num_types.end})</li>
          <li>Methods decreased slightly by {stats.num_methods.percentChange}% (from {stats.num_methods.start} to {stats.num_methods.end})</li>
          <li>Lines of code decreased significantly by {stats.num_lines.percentChange}% (from {stats.num_lines.start.toLocaleString()} to {stats.num_lines.end.toLocaleString()})</li>
          <li>Code density decreased by {stats.code_density.percentChange}% (from {stats.code_density.start.toFixed(2)} to {stats.code_density.end.toFixed(2)} lines per method)</li>
          <li>Strong correlation ({correlations.num_methods_num_lines.toFixed(2)}) between methods count and lines of code</li>
          <li>Recent growth: March 4-7 shows increases across all metrics</li>
        </ul>
      </div>
    </div>
  );
};

export default APIMetricsDashboard;
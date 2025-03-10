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
        // Use process.env.PUBLIC_URL to handle base path correctly in both dev and production
        const response = await fetch(`${process.env.PUBLIC_URL}/data/timeseries.csv`);
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
    try {
      const lines = csv.trim().split('\n');
      if (lines.length < 2) {
        console.error('CSV data is empty or invalid');
        return [];
      }
      
      const headers = lines[0].split(',');
      
      return lines.slice(1).map(line => {
        const values = line.split(',');
        if (values.length !== headers.length) {
          console.warn(`Skipping invalid line: ${line}`);
          return null;
        }
        
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = header === 'date' ? values[index] : Number.isNaN(parseInt(values[index])) ? 0 : parseInt(values[index]);
        });
        
        return row;
      }).filter(row => row !== null);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      return [];
    }
  };

  const processData = (parsedData) => {
    try {
      if (!parsedData || parsedData.length === 0) {
        console.error('No valid data to process');
        setIsLoading(false);
        return;
      }
      
      // Remove duplicate dates and sort by date
      const uniqueData = [];
      const dateMap = new Map();

      // Group entries by date and take the last entry for each date
      parsedData.forEach(row => {
        if (row && row.date) {
          dateMap.set(row.date, row);
        }
      });

      // Convert map back to array and sort by date
      Array.from(dateMap.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .forEach(([_, row]) => {
          // Calculate code density (lines per method)
          if (row.num_methods > 0) {
            row.code_density = parseFloat((row.num_lines / row.num_methods).toFixed(2));
          } else {
            row.code_density = 0;
          }
          
          uniqueData.push(row);
        });

      // Calculate statistics if we have data
      if (uniqueData.length > 0) {
        const metrics = ['num_files', 'num_types', 'num_methods', 'num_lines', 'code_density'];
        const calculatedStats = {};

        metrics.forEach(metric => {
          const values = uniqueData.map(row => row[metric] || 0);
          calculatedStats[metric] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100,
            start: values[0],
            end: values[values.length - 1],
            percentChange: values[0] > 0 ? 
              ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(2) : 
              '0.00'
          };
        });

        // Find significant changes
        const changes = [];
        for (let i = 1; i < uniqueData.length; i++) {
          const prevRow = uniqueData[i - 1];
          const currRow = uniqueData[i];
          
          metrics.forEach(metric => {
            if (metric !== 'code_density') {  // Skip derived metrics
              const prevValue = prevRow[metric] || 0;
              const currValue = currRow[metric] || 0;
              const change = currValue - prevValue;
              
              // Avoid division by zero
              const percentChange = prevValue !== 0 ? 
                (change / prevValue) * 100 : 
                change > 0 ? 100 : 0;
              
              // Consider changes of more than 3% significant for most metrics
              // For lines of code, use a higher threshold (5%) since it has larger fluctuations
              const threshold = metric === 'num_lines' ? 5 : 3;
              
              if (Math.abs(percentChange) > threshold) {
                changes.push({
                  date: currRow.date,
                  metric,
                  previousValue: prevValue,
                  newValue: currValue,
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
              const values1 = uniqueData.map(row => row[metric1] || 0);
              const values2 = uniqueData.map(row => row[metric2] || 0);
              
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
              
              // Calculate correlation coefficient (avoid division by zero)
              const correlation = (stdDev1 !== 0 && stdDev2 !== 0) ? 
                covariance / (stdDev1 * stdDev2) : 0;
              
              metricCorrelations[`${metric1}_${metric2}`] = parseFloat(correlation.toFixed(3));
            }
          });
        });

        // Create density data for the additional chart
        const densityChartData = uniqueData.map(row => ({
          date: row.date,
          code_density: row.code_density || 0,
        }));

        setDensityData(densityChartData);
        setCorrelations(metricCorrelations);
        setStats(calculatedStats);
        setSignificantChanges(changes);
        setData(uniqueData);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Error processing data:', err);
      setError('Failed to process data. Please try again later.');
      setIsLoading(false);
    }
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
              <span className="font-medium">{metricNames[change.metric]}:</span> {
                change.previousValue !== undefined ? change.previousValue.toLocaleString() : 'N/A'
              } → {
                change.newValue !== undefined ? change.newValue.toLocaleString() : 'N/A'
              } 
              <span className={`ml-2 ${change.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({change.change > 0 ? '+' : ''}{change.change !== undefined ? change.change.toLocaleString() : 'N/A'} / {change.percentChange}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMetricSummary = (metric) => {
    const metricStat = stats[metric];
    if (!metricStat) {
      return <div>No data available for this metric</div>;
    }
    
    return (
      <div className="flex flex-wrap justify-between text-sm">
        <div>Start: <span className="font-medium">{metricStat.start !== undefined ? metricStat.start.toLocaleString() : 'N/A'}</span></div>
        <div>End: <span className="font-medium">{metricStat.end !== undefined ? metricStat.end.toLocaleString() : 'N/A'}</span></div>
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

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">TT-Metal Public API Surface Dashboard</h1>
        <p className="text-gray-600">Tracking changes to TT-Metal public API surface over time.</p>
      </div>

      {renderSignificantChanges()}

      <div className="space-y-6">
        {renderChart('num_files')}
        {renderChart('num_types')}
        {renderChart('num_methods')}
        {renderChart('num_lines')}
        {renderDensityChart()}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-medium mb-2">Key Insights:</h3>
        <ul className="space-y-2">
          {stats.num_files && (
            <li>Files increased by {stats.num_files.percentChange}% (from {stats.num_files.start} to {stats.num_files.end})</li>
          )}
          {stats.num_types && (
            <li>Types increased by {stats.num_types.percentChange}% (from {stats.num_types.start} to {stats.num_types.end})</li>
          )}
          {stats.num_methods && (
            <li>Methods decreased slightly by {stats.num_methods.percentChange}% (from {stats.num_methods.start} to {stats.num_methods.end})</li>
          )}
          {stats.num_lines && (
            <li>Lines of code decreased significantly by {stats.num_lines.percentChange}% (from {stats.num_lines.start.toLocaleString()} to {stats.num_lines.end.toLocaleString()})</li>
          )}
          {stats.code_density && (
            <li>Code density decreased by {stats.code_density.percentChange}% (from {stats.code_density.start.toFixed(2)} to {stats.code_density.end.toFixed(2)} lines per method)</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default APIMetricsDashboard;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';

const HeaderLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('most_lines_of_code');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  // References to the Monaco editor instance and monaco object
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  // Base URL for GitHub repository links
  const repoBaseUrl = "https://github.com/tenstorrent/tt-metal/blob/main/tt_metal/api/tt-metalium";
  // Raw content URL for GitHub
  const rawContentBaseUrl = "https://raw.githubusercontent.com/tenstorrent/tt-metal/refs/heads/main/tt_metal/api/tt-metalium";

  // Function to clear all highlights - define this first
  const clearHighlights = useCallback(() => {
    if (decorationsRef.current && decorationsRef.current.length) {
      const editor = editorRef.current;
      if (editor) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    }
  }, []);
  
  // Helper to get highlight color based on region type
  const getColorForRegionType = useCallback((regionType) => {
    switch (regionType) {
      case 'types': return '#4CAF50'; // Green
      case 'methods': return '#2196F3'; // Blue
      case 'implementations': return '#FF9800'; // Orange
      default: return '#BBBBBB'; // Gray
    }
  }, []);
  
  // Get appropriate hover message based on region type and data
  const getHoverMessage = useCallback((regionType, region) => {
    if (regionType === 'types' && region.type) {
      return `${region.type} (lines ${region.start}-${region.end})`;
    }
    if (regionType === 'methods' && region.type) {
      return `${region.type} (lines ${region.start}-${region.end})`;
    }
    return `${regionType.charAt(0).toUpperCase() + regionType.slice(1)} (lines ${region.start}-${region.end})`;
  }, []);

  // Function to highlight regions of a specific type - define before any useEffect that uses it
  const highlightRegions = useCallback((regionType) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    if (!editor || !monaco || !selectedFile || !selectedFile.highlight_regions) return;
    
    // Clear previous highlights
    clearHighlights();
    
    // If none selected, just return after clearing
    if (regionType === 'none') return;
    
    // Prepare highlight decorations
    const regions = selectedFile.highlight_regions[regionType] || [];
    
    if (regions.length === 0) {
      console.log(`No ${regionType} regions found for this file`);
      return;
    }
    
    console.log(`Highlighting ${regions.length} ${regionType} regions`);
    
    // Create decorations array with proper styling
    const decorations = regions.map(region => ({
      range: new monaco.Range(region.start, 1, region.end, 1),
      options: {
        isWholeLine: true,
        className: `highlighted-${regionType}-line`,
        glyphMarginClassName: `glyph-margin-${regionType}`,
        linesDecorationsClassName: `line-decoration-${regionType}`,
        marginClassName: `margin-${regionType}`,
        minimap: { 
          color: getColorForRegionType(regionType),
          position: 1 
        },
        overviewRuler: { 
          color: getColorForRegionType(regionType),
          position: 7 
        },
        hoverMessage: { value: getHoverMessage(regionType, region) }
      }
    }));
    
    // Apply decorations
    if (decorations.length > 0) {
      decorationsRef.current = editor.deltaDecorations([], decorations);
      
      // Scroll to the first highlight if available
      editor.revealLineInCenter(regions[0].start);
    }
  }, [selectedFile, clearHighlights, getColorForRegionType, getHoverMessage]);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`${process.env.PUBLIC_URL}/data/leaderboard.json?v=${timestamp}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const data = await response.json();
        setLeaderboardData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
        setError('Failed to load leaderboard data. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  // Update highlighting when tab changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && selectedFile) {
      // Map tab to highlight type
      const highlightMap = {
        'most_lines_of_code': 'none',  // No highlights for this tab
        'most_implementation_lines': 'implementations',
        'most_methods': 'methods',
        'most_types': 'types'
      };
      
      highlightRegions(highlightMap[activeTab] || 'none');
    }
  }, [activeTab, selectedFile, highlightRegions]);

  // Automatically select the top file when switching tabs
  useEffect(() => {
    if (leaderboardData && leaderboardData[activeTab] && leaderboardData[activeTab].length > 0) {
      // Select the top file (first in the list) for the current tab
      const topFile = leaderboardData[activeTab][0];
      handleRowClick(topFile);
    }
  }, [activeTab, leaderboardData]);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!selectedFile) return;
      
      setFileLoading(true);
      try {
        // Try to fetch the file content from the raw GitHub URL
        const response = await fetch(`${rawContentBaseUrl}/${selectedFile.filename}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        setFileContent(content);
      } catch (err) {
        console.error('Error loading file content:', err);
        setFileContent(`Error loading file: ${err.message}`);
      } finally {
        setFileLoading(false);
      }
    };

    fetchFileContent();
  }, [selectedFile, rawContentBaseUrl]);

  // Category titles and descriptions for tabs
  const categoryInfo = {
    most_lines_of_code: {
      title: 'Most Lines of Code',
      description: 'Header files with the highest total line count',
      metric: 'num_lines',
      label: 'lines'
    },
    most_implementation_lines: {
      title: 'Most Implementation in Headers',
      description: 'HPP files with the most implementation code (function bodies)',
      metric: 'implementation_lines',
      label: 'implementation lines'
    },
    most_methods: {
      title: 'Most Methods',
      description: 'Header files declaring the most methods and functions',
      metric: 'num_methods',
      label: 'methods'
    },
    most_types: {
      title: 'Most Types',
      description: 'Header files defining the most types (classes, structs, enums)',
      metric: 'num_types',
      label: 'types'
    }
  };

  const renderTabs = () => {
    return (
      <div className="tabs mb-4">
        {Object.keys(categoryInfo).map(category => (
          <button
            key={category}
            className={`tab-button px-4 py-2 mr-1 rounded-t-lg ${activeTab === category ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab(category)}
          >
            {categoryInfo[category].title}
          </button>
        ))}
      </div>
    );
  };

  const handleRowClick = (file) => {
    setSelectedFile(file);
  };

  // Function to handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Apply default highlights if file is selected
    if (editor && monaco && selectedFile && selectedFile.highlight_regions) {
      // Map tab to highlight type
      const highlightMap = {
        'most_lines_of_code': 'none',
        'most_implementation_lines': 'implementations',
        'most_methods': 'methods',
        'most_types': 'types'
      };
      
      highlightRegions(highlightMap[activeTab] || 'none');
    }
  };

  const renderLeaderboard = () => {
    if (!leaderboardData || !leaderboardData[activeTab]) {
      return <div>No data available</div>;
    }

    const category = categoryInfo[activeTab];
    
    return (
      <div>
        <h3 className="text-xl mb-2">{category.title}</h3>
        <p className="text-gray-600 mb-4">{category.description}</p>
        
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full bg-white">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">File</th>
                <th className="px-4 py-2 text-right">{category.metric.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData[activeTab].map((file, index) => (
                <tr 
                  key={file.path} 
                  className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 cursor-pointer ${selectedFile && selectedFile.path === file.path ? 'bg-blue-100' : ''}`}
                  onClick={() => handleRowClick(file)}
                >
                  <td className="px-4 py-2 text-left">{index + 1}</td>
                  <td className="px-4 py-2 text-left font-mono text-sm">
                    <a 
                      href={`${repoBaseUrl}/${file.filename}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {file.filename}
                    </a>
                    <span className="block text-xs text-gray-500">{file.path}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{file[category.metric].toLocaleString()} {category.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFileContent = () => {
    if (!selectedFile) {
      return (
        <div className="p-4 text-center text-gray-500 flex-1 flex items-center justify-center">
          Select a file from the table to view its contents
        </div>
      );
    }

    if (fileLoading) {
      return <div className="p-4 text-center flex-1 flex items-center justify-center">Loading file content...</div>;
    }

    // Determine the language based on file extension
    const getLanguage = (filename) => {
      const extension = filename.split('.').pop().toLowerCase();
      switch (extension) {
        case 'cpp':
        case 'cc':
        case 'c':
          return 'cpp';
        case 'h':
        case 'hpp':
          return 'cpp';
        case 'js':
          return 'javascript';
        case 'py':
          return 'python';
        case 'json':
          return 'json';
        default:
          return 'plaintext';
      }
    };

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 bg-gray-100 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">{selectedFile.filename}</h3>
              <p className="text-sm text-gray-600">{selectedFile.path}</p>
            </div>
            <div>
              <a 
                href={`${repoBaseUrl}/${selectedFile.filename}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline text-sm"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            width="100%"
            language={getLanguage(selectedFile.filename)}
            value={fileContent}
            theme="custom-light"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 14,
              automaticLayout: true,
              wordWrap: 'on',
              folding: true,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
            }}
            onMount={handleEditorDidMount}
            beforeMount={(monaco) => {
              // Add custom CSS for highlighted lines
              monaco.editor.defineTheme('custom-light', {
                base: 'vs',
                inherit: true,
                rules: [],
                colors: {
                  'editor.lineHighlightBackground': '#FFFF9933',
                }
              });
              
              // Add CSS for each type of highlight
              const styleElement = document.createElement('style');
              styleElement.textContent = `
                .highlighted-types-line { background-color: rgba(76, 175, 80, 0.15) !important; border-left: 3px solid #4CAF50 !important; }
                .highlighted-methods-line { background-color: rgba(33, 150, 243, 0.15) !important; border-left: 3px solid #2196F3 !important; }
                .highlighted-implementations-line { background-color: rgba(255, 152, 0, 0.15) !important; border-left: 3px solid #FF9800 !important; }
                .highlighted-custom-line { background-color: rgba(255, 235, 59, 0.15) !important; border-left: 3px solid #FFC107 !important; }
                
                .line-decoration-types { background-color: #4CAF50 !important; width: 3px !important; margin-left: 3px; }
                .line-decoration-methods { background-color: #2196F3 !important; width: 3px !important; margin-left: 3px; }
                .line-decoration-implementations { background-color: #FF9800 !important; width: 3px !important; margin-left: 3px; }
              `;
              document.head.appendChild(styleElement);
            }}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading header leaderboard data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="header-leaderboard p-4 border rounded-lg bg-white h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">API Header Leaderboard</h2>
      
      <div className="flex flex-row flex-1 overflow-hidden">
        <div className="w-1/3 pr-4 border-r overflow-y-auto">
          {renderTabs()}
          {renderLeaderboard()}
          <div className="mt-4 text-xs text-gray-500">
            Generated on: {leaderboardData.generated_at} • Total files analyzed: {leaderboardData.total_files_analyzed}
          </div>
        </div>
        <div className="w-2/3 pl-4 flex flex-col overflow-hidden">
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
};

export default HeaderLeaderboard; 
import React, { useState } from 'react';
import InteractivePlot from './components/InteractivePlot';
import { optimizePolygonSettings, validateOptimizationParams } from './utils/distanceProtectionOptimizer';

function App() {
  const [globalData, setGlobalData] = useState([]);

  const handleOptimize = () => {
    // Optimize parameters based on global data
    const optimizedParams = optimizePolygonSettings(globalData);

    // Validate and sanitize the optimized parameters
    const sanitizedParams = validateOptimizationParams(optimizedParams);

    // You might want to pass these optimized parameters back to InteractivePlot
    console.log('Optimized Parameters:', sanitizedParams);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Distance Protection Characteristic Analyzer
        </h1>
        <InteractivePlot
          onOptimize={handleOptimize}  // Optional: pass optimization method
        />
      </div>
    </div>
  );
}

export default App;
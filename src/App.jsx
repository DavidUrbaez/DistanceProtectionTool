import React, { useState } from 'react';
import InteractivePlot from './components/InteractivePlot';
import { CSVUpload, handleParsedData } from './components/CSVHandler/SimpleCSVLoader'
function App() {
  const [data, setData] = useState([]);
  const handleParsedData = (parsedData) => {
    setData(parsedData); // Update the component's data state
    //setError(''); // Clear any existing errors
  };


  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Distance Protection Characteristic Analyzer
        </h1>
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">

          <div class="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
            <h2 class="text-2xl font-bold text-white">
              Distance Protection Visualization
            </h2>
            <p class="mt-1 text-blue-100">
              Upload your CSV file with R and X coordinates
            </p>
          </div>
          <div className="p-4">


            <CSVUpload onDataParsed={handleParsedData} />
            <InteractivePlot data={data} />


          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
import React from 'react';

import InteractivePlot from './components/InteractivePlot';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <InteractivePlot />
      </div>
    </div>
  );
}

export default App;
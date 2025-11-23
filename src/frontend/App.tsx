import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ComparisonPage from './pages/ComparisonPage';
import HistoryPage from './pages/HistoryPage';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage token={token} onToken={setToken} />} />
        <Route path="/compare" element={<ComparisonPage token={token} />} />
        <Route path="/history" element={<HistoryPage token={token} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Client from './pages/Client';
import Admin from './pages/Admin';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-navy text-cream">
        <Routes>
          <Route path="/" element={<Client />} />
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

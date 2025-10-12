import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Phone from './pages/Phone';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="logo">📄 PrintChakra</h1>
            <div className="nav-links">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/phone" className="nav-link">Phone</Link>
            </div>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/phone" element={<Phone />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

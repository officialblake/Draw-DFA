import React from 'react';
import './App.css';
import DfaNfaVisualizer from './Canvas';
import { FaGithub } from 'react-icons/fa';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title">DFA/NFA Visualizer</h1>
        <h2 className="subtitle">Created by Blake Marshall, Homero Arellano, & Jacob Sellers</h2>
        <div style={{ marginTop: '20px' }}>
          <a 
            href="https://github.com/officialblake/Draw-DFA" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="github-button"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: '#27263a', 
              color: 'white', 
              padding: '10px 20px', 
              borderRadius: '20px', 
              textDecoration: 'none', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            <FaGithub className="github-icon" /> See more on GitHub
          </a>
        </div>
      </header>
      <div className="visualizer-container">
        <DfaNfaVisualizer />
      </div>
    </div>
  );
}

export default App;

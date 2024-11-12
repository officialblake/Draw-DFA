import React from 'react';
import './App.css';
import DfaNfaVisualizer from './Canvas';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title">DFA/NFA Visualizer</h1>
        <h2 className="subtitle">Created by Blake Marshall, Homero Arellano, & Jacob Sellers</h2>
      </header>
      <div className="visualizer-container">
        <DfaNfaVisualizer />
      </div>
    </div>
  );
}

export default App;
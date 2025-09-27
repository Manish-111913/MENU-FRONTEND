import React from 'react';
import ReactDOM from 'react-dom/client';
import './shared.css';
import App from './App';

// Log API base at startup for clarity (only in dev or explicit flag)
if (typeof window !== 'undefined') {
  const apiBase = process.env.REACT_APP_API_BASE || '(relative)';
  // eslint-disable-next-line no-console
  console.log('[QR_FLOW][BOOT] API_BASE =', apiBase, 'BUSINESS_ID =', process.env.REACT_APP_BUSINESS_ID || '(none)');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
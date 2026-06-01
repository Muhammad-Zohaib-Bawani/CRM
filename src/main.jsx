import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './store/AuthContext.jsx';
import { DataProvider } from './store/DataContext.jsx';
import './styles/global.css';

// HashRouter is used so the prototype works when opened directly as a single
// HTML file (file://) — pretty URLs would require a server.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);

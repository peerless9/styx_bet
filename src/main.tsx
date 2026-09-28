import React from 'react';
import ReactDOM from 'react-dom/client';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './App';
import { isNativeApp } from './lib/platform';
import './index.css';

if (isNativeApp) {
  // Dark status-bar text over the app's light header
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

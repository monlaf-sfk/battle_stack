import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { configureMonacoOffline } from './utils/monacoConfig'

// Configure Monaco Editor for offline use to prevent CDN loading issues
configureMonacoOffline();

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  // </React.StrictMode>,
)

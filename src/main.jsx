import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { I18nProvider } from './i18n/index.jsx'
import { PricingProvider } from './pricing/PricingContext.jsx'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <PricingProvider>
            <App />
          </PricingProvider>
        </AuthProvider>
      </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

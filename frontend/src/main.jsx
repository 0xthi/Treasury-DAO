import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import DepositComponent from './components/Deposit.jsx'
import TestComponent from './components/Test.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <w3m-button />
    <DepositComponent />
  </StrictMode>,
)

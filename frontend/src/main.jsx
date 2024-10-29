import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import DepositComponent from '@/components/Deposit.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ThemeToggle />
      <w3m-button />
      <DepositComponent />
    </ThemeProvider>
  </StrictMode>,
);

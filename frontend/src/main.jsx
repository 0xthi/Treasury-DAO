import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import DepositComponent from '@/components/Deposit.jsx';
import { Typography } from '@mui/material'; // Import Typography from MUI
import './main.css'; // Import your CSS file if you have one
import BalancesComponent from './components/Balances.jsx';
import IntentsComponent from './components/IntentsComponent.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
      <Typography variant="h4" component="h1" style={{ margin: '20px', textAlign: 'center', width: '100%' }}>
        Treasury DAO
      </Typography>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ flex: '1', marginRight: '10px', display: 'flex', alignItems: 'stretch' }}>
          <div style={{ flex: '1', minHeight: '300px' }}>
            <DepositComponent />
          </div>
        </div>
        <div style={{ flex: '1', marginLeft: '12px', display: 'flex', alignItems: 'stretch' }}>
          <div style={{ flex: '1', minHeight: '300px' }}>
            <BalancesComponent />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
        <w3m-button 
          balance={false} // Disable balance display
        />
      </div>
      <IntentsComponent />
    </div>
    
  </StrictMode>,
);

import React from 'react';
import {BrowserRouter as Router,Routes,Route,Navigate} from 'react-router-dom';
import {ThemeProvider} from './components/ThemeContext';

import UserRegister from './components/UserRegister';
import UserLogin from './components/UserLogin';
import BusinessProfile from './components/BusinessProfile';
import TransactionLedger from './components/TransactionLedger';
import TaxDashboard from './components/TaxDashboard';
import ImportWorkspace from './components/ImportWorkspace';
import AnalyticsView from './components/AnalyticsView'; 


function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element ={<UserLogin />} />
          <Route path="/register" element={<UserRegister />} />
          <Route path="/business-profile" element={<BusinessProfile />} />
          <Route path="/transaction-ledger" element ={<TransactionLedger />} />
          <Route path="/tax-summary" element ={<TaxDashboard />} />
          <Route path="import" element ={<ImportWorkspace />} />
          <Route path="/analytics" element={<AnalyticsView />} />

          <Route path="*" element = {<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;

// src/components/Layout/Layout.tsx
import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';

import Sidebar from './Sidebar';
import Header from './Header';
import LoginPage from '../Auth/LoginPage';
import CreateVendor from '../Vendor/CreateVendor';
import VendorList from '../Vendor/VendorList';
import VendorDetails from '../Vendor/VendorDetails';
import BillGenerator from '../Bill/BillGenerator';
import type { Vendor } from '../../types';

// 🔥 Protected App Content
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const handleLogin = (email: string, password: string) => {
    if (email === 'admin@company.com' && password === 'admin123') {
      setIsAuthenticated(true);
      navigate('/vendors');
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEditingVendor(null);
    setSelectedVendorId(null);
    navigate('/login');
  };

  const getTitle = () => {
    const path = location.pathname;

   
    
    if (path === '/vendors/create') return 'Create Vendor';
    if (path === '/vendors/edit') return 'Edit Vendor';
    if (path === '/vendors') return 'All Vendors';
    if (path.startsWith('/vendors/')) return 'Vendor Details';
    if (path === '/bill') return 'Generate Bill';
    if (path === '/settings') return 'Settings';

    return 'Dashboard';
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex">
      <Sidebar onLogout={handleLogout} />

      <div className="flex-1 ml-72">
        <Header title={getTitle()} />

        <main className="p-8">
          <Routes>
            {/* <Route path="/dashboard" element={<Dashboard />} /> */}

            <Route
              path="/vendors"
              element={
                <VendorList
                  onVendorClick={(id) => {
                    setSelectedVendorId(id);
                    navigate(`/vendors/${id}`);
                  }}
                  onEditVendor={(vendor) => {
                    setEditingVendor(vendor);
                    navigate('/vendors/edit');
                  }}
                />
              }
            />

            <Route
              path="/vendors/create"
              element={<CreateVendor onVendorSaved={() => navigate('/vendors')} />}
            />

            <Route
              path="/vendors/edit"
              element={
                <CreateVendor
                  editingVendor={editingVendor}
                  onVendorSaved={() => navigate('/vendors')}
                />
              }
            />

            <Route
              path="/vendors/:id"
              element={<VendorDetails vendorId={selectedVendorId || ''} />}
            />

            <Route path="/bill" element={<BillGenerator />} />

            <Route
              path="/settings"
              element={<div className="card">Settings Coming Soon</div>}
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// 🔥 Dashboard Page
const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card">
        <h3>Total Vendors</h3>
        <p>{JSON.parse(localStorage.getItem('vendors') || '[]').length}</p>
      </div>

      <div className="card">
        <h3>Total Bills</h3>
        <p>{JSON.parse(localStorage.getItem('bills') || '[]').length}</p>
      </div>

      <div className="card">
        <h3>Revenue</h3>
        <p>₹0</p>
      </div>
    </div>
  );
};

// 🔥 Main Layout Wrapper
const Layout: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default Layout;
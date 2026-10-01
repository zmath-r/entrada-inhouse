import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ResidentView from './pages/ResidentView';
import GuestPass from './pages/GuestPass';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));

  const handleLogin = (newToken, role) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', role);
    setToken(newToken);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUserRole(null);
  };

  return (
    <Router>
      <Routes>
        {/* Rota Pública para Convidados / Visitantes */}
        <Route path="/invite/:code" element={<GuestPass />} />
        <Route path="/guest/:code" element={<GuestPass />} />

        <Route 
          path="/login" 
          element={!token ? <Login onLogin={handleLogin} /> : <Navigate to={userRole === 'ADMIN' ? '/admin' : '/resident'} />} 
        />
        
        <Route 
          path="/admin" 
          element={token && userRole === 'ADMIN' ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/resident" 
          element={token && userRole === 'RESIDENT' ? <ResidentView onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

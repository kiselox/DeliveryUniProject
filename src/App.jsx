import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Vendor from './pages/Vendor';
import Customer from './pages/Customer';
import Courier from './pages/Courier';
import Admin from './pages/Admin';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <div>
        {/* Временная навигация для удобства переключения */}
        <nav style={{ padding: '15px', background: '#f5f5f5', marginBottom: '20px', borderBottom: '1px solid #ccc' }}>
          <Link to="/" style={{ marginRight: '15px', fontWeight: 'bold' }}>Главная</Link>
          <Link to="/vendor" style={{ marginRight: '15px' }}>Ресторан</Link>
          <Link to="/customer" style={{ marginRight: '15px' }}>Клиент</Link>
          <Link to="/courier" style={{ marginRight: '15px' }}>Курьер</Link>
          <Link to="/admin" style={{ marginRight: '15px' }}>Админ</Link>
          <Link to="/login">Вход</Link>
        </nav>

        <Routes>
          <Route path="/" element={<h1 style={{ padding: '0 20px' }}>Polonez Delivery 🚗💨</h1>} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/customer" element={<Customer />} />
          <Route path="/courier" element={<Courier />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

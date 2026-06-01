import { BrowserRouter as Router, Routes, Route, Link } from 'react-router';

import Home from './pages/Home/Home';
import CustomerMain from './pages/Customer/CustomerMain';
import CustomerMenu from './pages/Customer/CustomerMenu';
import Courier from './pages/Courier/CourierMain';
import Admin from './pages/Admin/AdminMain';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <nav style={{
            padding: '10px 20px',
            background: 'rgba(21, 16, 48, 0.85)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 99
          }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
              🏠 Главная (Смена профиля)
            </Link>
            <Link to="/admin" style={{ color: '#ff7beb', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
              🛡️ Диспетчерская
            </Link>
          </nav>

          <div style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/customer/:id" 
                element={
                  <ProtectedRoute role="customer">
                    <CustomerMain />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/customer/:id/vendor/:vendorId" 
                element={
                  <ProtectedRoute role="customer">
                    <CustomerMenu />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/courier/:id" 
                element={
                  <ProtectedRoute role="courier">
                    <Courier />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/courier/:id/:tab" 
                element={
                  <ProtectedRoute role="courier">
                    <Courier />
                  </ProtectedRoute>
                } 
              />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CustomerRegistrationForm from './components/CustomerRegistrationForm';
import CourierRegistrationForm from './components/CourierRegistrationForm';
import ActiveProfilesList from './components/ActiveProfilesList';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { developerLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('customer');
  const [authMode, setAuthMode] = useState('login');
  
  const [customers, setCustomers] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const [custRes, courRes] = await Promise.all([
          api.get('/customers'),
          api.get('/couriers')
        ]);
        setCustomers(custRes.data || []);
        setCouriers(courRes.data || []);
      } catch (err) {
        console.error('Error loading registered users:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleDeveloperClick = async (userId, role) => {
    try {
      setErrorMsg('');
      setSuccessMsg('Developer login… 🛠️');
      const user = await developerLogin(userId, role);
      setSuccessMsg(`Quick login successful as ${user.name}!`);
      
      setTimeout(() => {
        navigate(role === 'customer' ? `/customer/${user.id}` : `/courier/${user.id}`);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to perform quick login.');
      setSuccessMsg('');
    }
  };

  return (
    <div className="portal-bg">
      <h1 className="portal-title">POLONEZ Delivery 🚗💨</h1>
      <p className="portal-subtitle">Real-time food delivery in Poznań made easy</p>

      {}
      <div className="glass-card">
        {}
        <div className="glass-tabs">
          <button
            type="button"
            className={`glass-tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => { setActiveTab('customer'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            🛒 Customer
          </button>
          <button
            type="button"
            className={`glass-tab-btn ${activeTab === 'courier' ? 'active' : ''}`}
            onClick={() => { setActiveTab('courier'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            🚲 Courier
          </button>
        </div>

        {}
        <div className="auth-mode-toggler">
          <button
            onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
          >
            🔑 Log In
          </button>
          <button
            onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`auth-mode-btn ${authMode === 'register' ? 'active' : ''}`}
          >
            📝 Create Account
          </button>
        </div>

        {}
        {errorMsg && <div className="feedback-msg error">⚠️ {errorMsg}</div>}
        {successMsg && <div className="feedback-msg success">✨ {successMsg}</div>}

        {}
        {authMode === 'login' ? (
          <LoginForm role={activeTab} setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
        ) : (
          <>
            {activeTab === 'customer' ? (
              <CustomerRegistrationForm setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
            ) : (
              <CourierRegistrationForm setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
            )}
          </>
        )}

        {}
        <ActiveProfilesList 
          activeTab={activeTab} 
          customers={customers} 
          couriers={couriers} 
          isLoading={isLoading} 
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
        />
      </div>

      {}
      <div className="legacy-panel">
        <h4 className="legacy-panel-title">
          🛠️ Developer Quick Login Panel
        </h4>
        <div className="legacy-btn-row">
          <button onClick={() => handleDeveloperClick('c1', 'customer')} className="legacy-btn">🛒 Denis (Customer)</button>
          <button onClick={() => handleDeveloperClick('cour1', 'courier')} className="legacy-btn">🚲 Courier 1 (Velo)</button>
          <button onClick={() => handleDeveloperClick('cour2', 'courier')} className="legacy-btn">🛵 Courier 2 (Scooter)</button>
          <button onClick={() => handleDeveloperClick('cour3', 'courier')} className="legacy-btn">🚗 Courier 3 (Car)</button>
          <button 
            onClick={async () => {
              try {
                await developerLogin('admin', 'admin');
                navigate('/admin');
              } catch (err) {
                console.error('Failed developer login as admin:', err);
                navigate('/admin');
              }
            }} 
            className="legacy-btn legacy-btn-admin"
          >
            💻 Support Panel (Admin)
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ role, setErrorMsg, setSuccessMsg }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please fill in all fields!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('Verifying authorization data...');
      
      const user = await login(role, email, password);
      setSuccessMsg(`Login successful! Welcome back, ${user.name}!`);

      setTimeout(() => {
        navigate(role === 'customer' ? `/customer/${user.id}` : `/courier/${user.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Login error. Please check your credentials.');
      setSuccessMsg('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleLoginSubmit}>
      <div className="glass-input-group">
        <label className="glass-label">Email Address</label>
        <input
          type="email"
          className="glass-input"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="glass-input-group">
        <label className="glass-label">Password</label>
        <input
          type="password"
          className="glass-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <button type="submit" className="glass-btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Authorizing...' : 'Log In'}
      </button>
    </form>
  );
}

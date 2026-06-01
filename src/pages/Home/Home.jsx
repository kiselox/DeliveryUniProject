// src/pages/Home/Home.jsx
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
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'courier'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  
  const [customers, setCustomers] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global feedback states passed to forms
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all registered users on load
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
        console.error('Ошибка загрузки зарегистрированных пользователей:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleDeveloperClick = async (userId, role) => {
    try {
      setErrorMsg('');
      setSuccessMsg('Вход разработчика… 🛠️');
      const user = await developerLogin(userId, role);
      setSuccessMsg(`Успешный быстрый вход под именем ${user.name}!`);
      
      setTimeout(() => {
        navigate(role === 'customer' ? `/customer/${user.id}` : `/courier/${user.id}`);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Не удалось выполнить быстрый вход.');
      setSuccessMsg('');
    }
  };

  return (
    <div className="portal-bg">
      <h1 className="portal-title">POLONEZ Delivery 🚗💨</h1>
      <p className="portal-subtitle">Удобная доставка еды по Познани в реальном времени</p>

      {/* REGISTRATION & LOGIN CARD */}
      <div className="glass-card">
        {/* TABS SELECTOR */}
        <div className="glass-tabs">
          <button
            type="button"
            className={`glass-tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => { setActiveTab('customer'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            🛒 Клиент
          </button>
          <button
            type="button"
            className={`glass-tab-btn ${activeTab === 'courier' ? 'active' : ''}`}
            onClick={() => { setActiveTab('courier'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            🚲 Курьер
          </button>
        </div>

        {/* MODE TOGGLER: SIGN IN OR REGISTER */}
        <div className="auth-mode-toggler">
          <button
            onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
          >
            🔑 Войти
          </button>
          <button
            onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`auth-mode-btn ${authMode === 'register' ? 'active' : ''}`}
          >
            📝 Создать аккаунт
          </button>
        </div>

        {/* FEEDBACK SYSTEM */}
        {errorMsg && <div className="feedback-msg error">⚠️ {errorMsg}</div>}
        {successMsg && <div className="feedback-msg success">✨ {successMsg}</div>}

        {/* FORMS SWITCHER */}
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

        {/* RECENTLY REGISTERED PROFILES */}
        <ActiveProfilesList 
          activeTab={activeTab} 
          customers={customers} 
          couriers={couriers} 
          isLoading={isLoading} 
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
        />
      </div>

      {/* LEGACY QUICK LOGINS & ADMIN */}
      <div className="legacy-panel">
        <h4 className="legacy-panel-title">
          🛠️ Панель быстрого входа разработчика
        </h4>
        <div className="legacy-btn-row">
          <button onClick={() => handleDeveloperClick('c1', 'customer')} className="legacy-btn">🛒 Денис (Клиент)</button>
          <button onClick={() => handleDeveloperClick('cour1', 'courier')} className="legacy-btn">🚲 Курьер 1 (Velo)</button>
          <button onClick={() => handleDeveloperClick('cour2', 'courier')} className="legacy-btn">🛵 Курьер 2 (Scooter)</button>
          <button onClick={() => handleDeveloperClick('cour3', 'courier')} className="legacy-btn">🚗 Курьер 3 (Car)</button>
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
            💻 Панель поддержки (Админ)
          </button>
        </div>
      </div>
    </div>
  );
}

// Sleek glassmorphic LoginForm component
function LoginForm({ role, setErrorMsg, setSuccessMsg }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Пожалуйста, заполните все поля!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('Проверяем данные авторизации…');
      
      const user = await login(role, email, password);
      setSuccessMsg(`Успешный вход! С возвращением, ${user.name}!`);

      setTimeout(() => {
        navigate(role === 'customer' ? `/customer/${user.id}` : `/courier/${user.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка входа. Проверьте введенные данные.');
      setSuccessMsg('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleLoginSubmit}>
      <div className="glass-input-group">
        <label className="glass-label">Электронная почта (Email)</label>
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
        <label className="glass-label">Пароль</label>
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
        {isSubmitting ? 'Авторизация…' : 'Войти в систему'}
      </button>
    </form>
  );
}

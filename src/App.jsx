import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router';

import CustomerMain from './pages/Customer/CustomerMain';
import CustomerMenu from './pages/Customer/CustomerMenu';
import Courier from './pages/Courier/CourierMain';
import Admin from './pages/Admin/AdminMain';
import api from './services/api';

function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'courier'
  const [customers, setCustomers] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for Customer
  const [custName, setCustName] = useState('');
  const [custLastName, setCustLastName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // Form states for Courier
  const [courName, setCourName] = useState('');
  const [courLastName, setCourLastName] = useState('');
  const [courEmail, setCourEmail] = useState('');
  const [courPhone, setCourPhone] = useState('');
  const [courVehicle, setCourVehicle] = useState('Bicycle');

  // Feedback states
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

  // Helper to geocode Poznań address keywords automatically
  const geocodePoznanAddress = (addressText) => {
    const text = (addressText || '').toLowerCase();
    if (text.includes('jeżyce') || text.includes('jezyce')) {
      return { lat: 52.4064, lng: 16.9015 };
    }
    if (text.includes('malta')) {
      return { lat: 52.4018, lng: 16.9605 };
    }
    if (text.includes('garbary')) {
      return { lat: 52.4132, lng: 16.9405 };
    }
    if (text.includes('półwiejska') || text.includes('polwiejska')) {
      return { lat: 52.4016, lng: 16.9275 };
    }
    if (text.includes('centrum') || text.includes('stare miasto')) {
      return { lat: 52.4069, lng: 16.9299 };
    }
    // Default to CDV Dormitory
    return { lat: 52.4140, lng: 16.9295 };
  };

  // Handle customer registration
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!custName.trim() || !custLastName.trim() || !custEmail.trim() || !custPhone.trim() || !custAddress.trim()) {
      setErrorMsg('Пожалуйста, заполните все поля формы (Имя, Фамилия, Email, Телефон, Адрес)!');
      return;
    }

    try {
      setErrorMsg('');
      setSuccessMsg('Секунду... Создаем аккаунт клиента');
      const coords = geocodePoznanAddress(custAddress);
      const response = await api.post('/customers', {
        name: custName.trim(),
        lastName: custLastName.trim(),
        email: custEmail.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        lat: coords.lat,
        lng: coords.lng
      });
      setSuccessMsg('Клиент успешно зарегистрирован!');
      
      // Direct navigation
      setTimeout(() => {
        navigate(`/customer/${response.data.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Произошла ошибка при регистрации клиента.');
      setSuccessMsg('');
    }
  };

  // Handle courier registration
  const handleCourierSubmit = async (e) => {
    e.preventDefault();
    if (!courName.trim() || !courLastName.trim() || !courEmail.trim() || !courPhone.trim()) {
      setErrorMsg('Пожалуйста, заполните все поля формы курьера (Имя, Фамилия, Email, Телефон)!');
      return;
    }

    try {
      setErrorMsg('');
      setSuccessMsg('Секунду... Создаем аккаунт курьера');
      const response = await api.post('/couriers', {
        name: courName.trim(),
        lastName: courLastName.trim(),
        email: courEmail.trim(),
        phone: courPhone.trim(),
        vehicle: courVehicle
      });
      setSuccessMsg('Курьер успешно зарегистрирован!');

      // Direct navigation
      setTimeout(() => {
        navigate(`/courier/${response.data.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Произошла ошибка при регистрации курьера.');
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

        {/* FEEDBACK SYSTEM */}
        {errorMsg && <div className="feedback-msg error">⚠️ {errorMsg}</div>}
        {successMsg && <div className="feedback-msg success">✨ {successMsg}</div>}

        {/* CUSTOMER REGISTRATION FORM */}
        {activeTab === 'customer' && (
          <form onSubmit={handleCustomerSubmit}>
            <div className="glass-input-row">
              <div className="glass-input-group">
                <label className="glass-label">Имя</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Иван"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                />
              </div>
              <div className="glass-input-group">
                <label className="glass-label">Фамилия</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Иванов"
                  value={custLastName}
                  onChange={(e) => setCustLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="glass-input-row">
              <div className="glass-input-group">
                <label className="glass-label">Электронная почта (Email)</label>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="ivanov@example.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  required
                />
              </div>
              <div className="glass-input-group">
                <label className="glass-label">Номер телефона</label>
                <input
                  type="tel"
                  className="glass-input"
                  placeholder="+48 123 456 789"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="glass-input-group">
              <label className="glass-label">Адрес доставки (текст)</label>
              <input
                type="text"
                className="glass-input"
                placeholder="Например, ul. Półwiejska 12, Poznań"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="glass-btn-primary">Зарегистрироваться и Войти</button>
          </form>
        )}

        {/* COURIER REGISTRATION FORM */}
        {activeTab === 'courier' && (
          <form onSubmit={handleCourierSubmit}>
            <div className="glass-input-row">
              <div className="glass-input-group">
                <label className="glass-label">Имя курьера</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Владислав"
                  value={courName}
                  onChange={(e) => setCourName(e.target.value)}
                  required
                />
              </div>
              <div className="glass-input-group">
                <label className="glass-label">Фамилия курьера</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Петров"
                  value={courLastName}
                  onChange={(e) => setCourLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="glass-input-row">
              <div className="glass-input-group">
                <label className="glass-label">Электронная почта (Email)</label>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="vladislav@example.com"
                  value={courEmail}
                  onChange={(e) => setCourEmail(e.target.value)}
                  required
                />
              </div>
              <div className="glass-input-group">
                <label className="glass-label">Номер телефона</label>
                <input
                  type="tel"
                  className="glass-input"
                  placeholder="+48 987 654 321"
                  value={courPhone}
                  onChange={(e) => setCourPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="glass-input-group">
              <label className="glass-label">Транспортное средство</label>
              <select
                className="glass-select"
                value={courVehicle}
                onChange={(e) => setCourVehicle(e.target.value)}
              >
                <option value="Bicycle">🚲 Велосипед (15 км/ч)</option>
                <option value="Scooter">🛴 Электросамокат (20 км/ч)</option>
                <option value="Car">🚗 Автомобиль (30 км/ч)</option>
              </select>
            </div>

            <button type="submit" className="glass-btn-primary">Зарегистрироваться и Войти</button>
          </form>
        )}

        {/* RECENTLY REGISTERED PROFILES */}
        <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#ff7beb', textAlign: 'left', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Активные профили в системе:
          </h3>
          {isLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Загрузка активных профилей...</div>
          ) : (
            <>
              {activeTab === 'customer' ? (
                customers.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'left' }}>Зарегистрированные клиенты отсутствуют.</div>
                ) : (
                  <div className="users-grid">
                    {customers.map((c) => (
                      <div key={c.id} className="user-card" onClick={() => navigate(`/customer/${c.id}`)}>
                        <span className="user-icon">🛒</span>
                        <span className="user-name">{c.name} {c.lastName || ''}</span>
                        <span className="user-subtext">{c.address}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                couriers.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'left' }}>Зарегистрированные курьеры отсутствуют.</div>
                ) : (
                  <div className="users-grid">
                    {couriers.map((cour) => (
                      <div key={cour.id} className="user-card" onClick={() => navigate(`/courier/${cour.id}`)}>
                        <span className="user-icon">
                          {cour.vehicle === 'Car' ? '🚗' : cour.vehicle === 'Scooter' ? '🛴' : '🚲'}
                        </span>
                        <span className="user-name">{cour.name} {cour.lastName || ''}</span>
                        <span className="user-subtext">
                          {cour.vehicle === 'Car' ? 'Авто' : cour.vehicle === 'Scooter' ? 'Самокат' : 'Вело'}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* LEGACY QUICK LOGINS & ADMIN */}
      <div className="legacy-panel">
        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#ffc107', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🛠️ Панель быстрого входа разработчика
        </h4>
        <div className="legacy-btn-row">
          <button onClick={() => navigate('/customer/c1')} className="legacy-btn">🛒 Денис (Клиент)</button>
          <button onClick={() => navigate('/courier/cour1')} className="legacy-btn">🚲 Курьер 1 (Velo)</button>
          <button onClick={() => navigate('/courier/cour2')} className="legacy-btn">🛴 Курьер 2 (Scooter)</button>
          <button onClick={() => navigate('/courier/cour3')} className="legacy-btn">🚗 Курьер 3 (Car)</button>
          <button onClick={() => navigate('/admin')} className="legacy-btn" style={{ background: 'rgba(170, 59, 255, 0.25)', borderColor: '#aa3bff' }}>
            💻 Панель поддержки (Админ)
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
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
            <Route path="/customer/:id" element={<CustomerMain />} />
            <Route path="/customer/:id/vendor/:vendorId" element={<CustomerMenu />} />
            <Route path="/courier/:id" element={<Courier />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router';

import CustomerMain from './pages/Customer/CustomerMain';
import CustomerMenu from './pages/Customer/CustomerMenu';
import Courier from './pages/Courier';
import Admin from './pages/Admin';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1>POLONEZ Delivery 🚗💨</h1>
      <h2>Войти как:</h2>
      <div className="home-buttons">
        <button onClick={() => navigate('/customer/c1')} className="btn-role">🛒 Денис (Клиент)</button>
        <button onClick={() => navigate('/courier/cour1')} className="btn-role">🚲 Курьер 1 (Velo)</button>
        <button onClick={() => navigate('/courier/cour2')} className="btn-role">🛴 Курьер 2 (Scooter)</button>
        <button onClick={() => navigate('/courier/cour3')} className="btn-role">🚗 Курьер 3 (Car)</button>
        <button onClick={() => navigate('/admin')} className="btn-role">💻 Саппорт (Админ)</button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div>
        <nav className="main-nav">
          <Link to="/" className="nav-link">Главная (Смена роли)</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/customer/:id" element={<CustomerMain />} />
          <Route path="/customer/:id/vendor/:vendorId" element={<CustomerMenu />} />
          <Route path="/courier/:id" element={<Courier />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

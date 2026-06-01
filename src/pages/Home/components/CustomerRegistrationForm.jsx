// src/pages/Home/components/CustomerRegistrationForm.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { geocodePoznanAddress } from '../../../utils/addressGeocoding';

export default function CustomerRegistrationForm({ setErrorMsg, setSuccessMsg }) {
  const navigate = useNavigate();
  const { registerCustomer } = useAuth();
  const [custName, setCustName] = useState('');
  const [custLastName, setCustLastName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!custName.trim() || !custLastName.trim() || !custEmail.trim() || !custPhone.trim() || !custAddress.trim() || !custPassword) {
      setErrorMsg('Пожалуйста, заполните все поля формы (Имя, Фамилия, Email, Телефон, Адрес, Пароль)!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('Секунду… Создаем аккаунт клиента');
      const coords = geocodePoznanAddress(custAddress);
      
      const user = await registerCustomer({
        name: custName.trim(),
        lastName: custLastName.trim(),
        email: custEmail.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        lat: coords.lat,
        lng: coords.lng,
        password: custPassword
      });
      
      setSuccessMsg('Клиент успешно зарегистрирован!');
      
      setTimeout(() => {
        navigate(`/customer/${user.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Произошла ошибка при регистрации клиента.');
      setSuccessMsg('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            required
          />
        </div>
      </div>
      
      <div className="glass-input-row">
        <div className="glass-input-group" style={{ flex: 2 }}>
          <label className="glass-label">Адрес доставки (текст)</label>
          <input
            type="text"
            className="glass-input"
            placeholder="Например, ul. Półwiejska 12, Poznań"
            value={custAddress}
            onChange={(e) => setCustAddress(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="glass-input-group" style={{ flex: 1 }}>
          <label className="glass-label">Пароль</label>
          <input
            type="password"
            className="glass-input"
            placeholder="••••••••"
            value={custPassword}
            onChange={(e) => setCustPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <button type="submit" className="glass-btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Регистрация…' : 'Зарегистрироваться и Войти'}
      </button>
    </form>
  );
}

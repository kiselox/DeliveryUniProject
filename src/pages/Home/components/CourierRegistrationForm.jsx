import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';

export default function CourierRegistrationForm({ setErrorMsg, setSuccessMsg }) {
  const navigate = useNavigate();
  const { registerCourier } = useAuth();
  const [courName, setCourName] = useState('');
  const [courLastName, setCourLastName] = useState('');
  const [courEmail, setCourEmail] = useState('');
  const [courPhone, setCourPhone] = useState('');
  const [courVehicle, setCourVehicle] = useState('Bicycle');
  const [courPassword, setCourPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCourierSubmit = async (e) => {
    e.preventDefault();
    if (!courName.trim() || !courLastName.trim() || !courEmail.trim() || !courPhone.trim() || !courPassword) {
      setErrorMsg('Please fill in all courier form fields (First Name, Last Name, Email, Phone, Password)!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('One moment... Creating courier account');
      
      const user = await registerCourier({
        name: courName.trim(),
        lastName: courLastName.trim(),
        email: courEmail.trim(),
        phone: courPhone.trim(),
        vehicle: courVehicle,
        password: courPassword
      });
      
      setSuccessMsg('Courier registered successfully!');

      setTimeout(() => {
        navigate(`/courier/${user.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during courier registration.');
      setSuccessMsg('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCourierSubmit}>
      <div className="glass-input-row">
        <div className="glass-input-group">
          <label className="glass-label">Courier First Name</label>
          <input
            type="text"
            className="glass-input"
            placeholder="Vlad"
            value={courName}
            onChange={(e) => setCourName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="glass-input-group">
          <label className="glass-label">Courier Last Name</label>
          <input
            type="text"
            className="glass-input"
            placeholder="Smith"
            value={courLastName}
            onChange={(e) => setCourLastName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div className="glass-input-row">
        <div className="glass-input-group">
          <label className="glass-label">Email Address</label>
          <input
            type="email"
            className="glass-input"
            placeholder="vlad.smith@example.com"
            value={courEmail}
            onChange={(e) => setCourEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="glass-input-group">
          <label className="glass-label">Phone Number</label>
          <input
            type="tel"
            className="glass-input"
            placeholder="+48 987 654 321"
            value={courPhone}
            onChange={(e) => setCourPhone(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div className="glass-input-row">
        <div className="glass-input-group" style={{ flex: 1 }}>
          <label className="glass-label">Vehicle Type</label>
          <select
            className="glass-select"
            value={courVehicle}
            onChange={(e) => setCourVehicle(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="Bicycle">Bicycle (15 km/h)</option>
            <option value="Scooter">Scooter (20 km/h)</option>
            <option value="Car">Car (30 km/h)</option>
          </select>
        </div>
        <div className="glass-input-group" style={{ flex: 1 }}>
          <label className="glass-label">Password</label>
          <input
            type="password"
            className="glass-input"
            placeholder="••••••••"
            value={courPassword}
            onChange={(e) => setCourPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <button type="submit" className="glass-btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register and Log In'}
      </button>
    </form>
  );
}

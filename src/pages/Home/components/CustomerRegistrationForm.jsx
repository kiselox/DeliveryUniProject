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
      setErrorMsg('Please fill in all fields (First Name, Last Name, Email, Phone, Address, Password)!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('One moment... Creating customer account');
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
      
      setSuccessMsg('Customer registered successfully!');
      
      setTimeout(() => {
        navigate(`/customer/${user.id}`);
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during customer registration.');
      setSuccessMsg('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCustomerSubmit}>
      <div className="glass-input-row">
        <div className="glass-input-group">
          <label className="glass-label">First Name</label>
          <input
            type="text"
            className="glass-input"
            placeholder="John"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="glass-input-group">
          <label className="glass-label">Last Name</label>
          <input
            type="text"
            className="glass-input"
            placeholder="Doe"
            value={custLastName}
            onChange={(e) => setCustLastName(e.target.value)}
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
            placeholder="john.doe@example.com"
            value={custEmail}
            onChange={(e) => setCustEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="glass-input-group">
          <label className="glass-label">Phone Number</label>
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
          <label className="glass-label">Delivery Address (text)</label>
          <input
            type="text"
            className="glass-input"
            placeholder="e.g., ul. Półwiejska 12, Poznań"
            value={custAddress}
            onChange={(e) => setCustAddress(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="glass-input-group" style={{ flex: 1 }}>
          <label className="glass-label">Password</label>
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
        {isSubmitting ? 'Registering...' : 'Register and Log In'}
      </button>
    </form>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';

export default function ActiveProfilesList({ activeTab, customers, couriers, isLoading }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleCardClick = (user) => {
    setSelectedUser(user);
    setPassword('');
    setModalError('');
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setModalError('Enter password!');
      return;
    }

    try {
      setIsLoggingIn(true);
      setModalError('');
      const role = activeTab;
      const user = await login(role, selectedUser.email, password);
      
      setSelectedUser(null);
      navigate(role === 'customer' ? `/customer/${user.id}` : `/courier/${user.id}`);
    } catch (err) {
      setModalError(err.message || 'Incorrect password. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
      <h3 style={{ fontSize: '14px', color: 'var(--accent)', textAlign: 'left', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
        Active Profiles in System:
      </h3>
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading active profiles…</div>
      ) : (
        <>
          {activeTab === 'customer' ? (
            customers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'left' }}>No registered customers found.</div>
            ) : (
              <div className="users-grid">
                {customers.map((c) => (
                  <div key={c.id} className="user-card" onClick={() => handleCardClick(c)}>
                    <span className="user-icon">🛒</span>
                    <span className="user-name">{c.name} {c.lastName || ''}</span>
                    <span className="user-subtext">{c.address}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            couriers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'left' }}>No registered couriers found.</div>
            ) : (
              <div className="users-grid">
                {couriers.map((cour) => (
                  <div key={cour.id} className="user-card" onClick={() => handleCardClick(cour)}>
                    <span className="user-icon">
                      {cour.vehicle === 'Car' ? '🚗' : cour.vehicle === 'Scooter' ? '🛵' : '🚲'}
                    </span>
                    <span className="user-name">{cour.name} {cour.lastName || ''}</span>
                    <span className="user-subtext">
                      {cour.vehicle === 'Car' ? 'Car' : cour.vehicle === 'Scooter' ? 'Scooter' : 'Velo'}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(10, 5, 22, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '30px 25px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <div style={{ fontSize: '38px', marginBottom: '12px' }}>🔒</div>
            
            <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Confirm Login
            </h4>
            
            <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Enter password for profile <strong style={{ color: 'var(--accent)' }}>{selectedUser.name} {selectedUser.lastName || ''}</strong>
            </p>

            {modalError && (
              <div style={{
                background: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid rgba(255, 59, 48, 0.2)',
                color: '#ff453a',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                textAlign: 'left',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="password"
                  placeholder="Profile password (default 123456)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  disabled={isLoggingIn}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #aa3bff 0%, #6e0dd0 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(170, 59, 255, 0.2)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {isLoggingIn ? 'Logging in...' : 'Log In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

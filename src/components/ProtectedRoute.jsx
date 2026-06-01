// src/components/ProtectedRoute.jsx
import { Navigate, useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, logout } = useAuth();
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  // 1. Not logged in at all
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Role mismatch
  const hasRoleMismatch = role && user.role !== role;

  // 3. ID mismatch (trying to access someone else's dashboard)
  const hasIdMismatch = routeId && user.id !== routeId;

  if (hasRoleMismatch || hasIdMismatch) {
    // RENDER AN EXTREMELY STUNNING PREMIUM GLASSMORPHIC ACCESS DENIED PAGE
    return (
      <div style={{
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1a0f30 0%, #0d061c 100%)',
        padding: '20px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Glowing aura effect */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(170, 59, 255, 0.15) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(30px)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />
        
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px 30px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          zIndex: 2,
          animation: 'fadeIn 0.5s ease-out'
        }}>
          {/* Animated Shield / Lock icon */}
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite ease-in-out',
            display: 'inline-block'
          }}>
            🛡️
          </div>

          <h2 style={{
            fontSize: '28px',
            fontWeight: '800',
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #ff7beb 0%, #aa3bff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Доступ ограничен
          </h2>

          <p style={{
            color: '#ccc',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '0 0 25px 0'
          }}>
            Вы вошли в систему как <strong style={{ color: '#ff7beb' }}>{user.name} {user.lastName || ''}</strong> ({user.role === 'customer' ? 'Клиент' : 'Курьер'}), но пытаетесь получить доступ к панели другого пользователя.
          </p>

          {/* Details callout block */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '30px',
            textAlign: 'left',
            fontSize: '13px',
            color: '#aaa',
            fontFamily: 'monospace'
          }}>
            <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Ваш ID:</span>
              <span style={{ color: '#00d26a', fontWeight: 'bold' }}>{user.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Запрошенный ID:</span>
              <span style={{ color: '#ff3b30', fontWeight: 'bold' }}>{routeId || 'Не указан'}</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <button
              onClick={() => navigate(user.role === 'customer' ? `/customer/${user.id}` : `/courier/${user.id}`)}
              style={{
                background: 'linear-gradient(135deg, #aa3bff 0%, #6e0dd0 100%)',
                color: '#fff',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(170, 59, 255, 0.3)',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Вернуться в свой профиль 🏠
            </button>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px 15px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                На главную
              </button>

              <button
                onClick={() => { logout(); navigate('/'); }}
                style={{
                  flex: 1,
                  background: 'rgba(255, 59, 48, 0.1)',
                  color: '#ff453a',
                  border: '1px solid rgba(255, 59, 48, 0.2)',
                  padding: '12px 15px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'}
              >
                Выйти из аккаунта 🚪
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

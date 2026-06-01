import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [token]);

  useEffect(() => {
    async function validateToken() {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.post('/auth/verify', { token: storedToken });
        setUser(response.data.user);
        setToken(storedToken);
      } catch (err) {
        console.warn('Session expired or invalid token:', err.response?.data?.error || err.message);
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    validateToken();
  }, []);

  const login = async (role, email, password) => {
    try {
      const response = await api.post('/auth/login', { role, email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem('authToken', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to log in!', { cause: err });
    }
  };

  const registerCustomer = async (formData) => {
    try {
      const response = await api.post('/auth/register/customer', formData);
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('authToken', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to register customer!', { cause: err });
    }
  };

  const registerCourier = async (formData) => {
    try {
      const response = await api.post('/auth/register/courier', formData);
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('authToken', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to register courier!', { cause: err });
    }
  };

  const developerLogin = async (userId, role) => {
    try {
      const response = await api.post('/auth/developer-bypass', { userId, role });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('authToken', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to bypass developer login!', { cause: err });
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    registerCustomer,
    registerCourier,
    developerLogin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

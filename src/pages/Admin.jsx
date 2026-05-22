import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import api from '../services/api';
import orderServices from '../services/orders-services';

export default function Admin() {
  const navigate = useNavigate();
  const [rateSaving, setRateSaving] = useState(false);
  const [customRateVelo, setCustomRateVelo] = useState('');
  const [customRateScooter, setCustomRateScooter] = useState('');
  const [customRateCar, setCustomRateCar] = useState('');
  
  // Modal state for editing order coefficient
  const [editingOrder, setEditingOrder] = useState(null);
  const [newCoefficient, setNewCoefficient] = useState('');

  // Modal state for viewing order details
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  // Client-side pagination state (load 10 by default)
  const [visibleCount, setVisibleCount] = useState(10);

  // 1. Fetch live settings (polled every 5 seconds)
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      // Initialize local state once settings are loaded
      if (customRateVelo === '') {
        setCustomRateVelo(res.data.pricePerKm.toString());
      }
      if (customRateScooter === '') {
        setCustomRateScooter(res.data.scooterPricePerKm?.toString() || '5.5');
      }
      if (customRateCar === '') {
        setCustomRateCar(res.data.carPricePerKm?.toString() || '7.0');
      }
      return res.data;
    },
    refetchInterval: 5000
  });

  // 2. Fetch live orders (polled every 3 seconds for instant updates)
  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderServices.getOrders(),
    refetchInterval: 3000
  });

  // Action: Save custom price rate
  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!customRateVelo || isNaN(customRateVelo) || !customRateScooter || isNaN(customRateScooter) || !customRateCar || isNaN(customRateCar)) {
      alert("Пожалуйста, введите корректные числовые значения тарифов.");
      return;
    }
    try {
      setRateSaving(true);
      await api.post('/settings', {
        pricePerKm: parseFloat(customRateVelo),
        scooterPricePerKm: parseFloat(customRateScooter),
        carPricePerKm: parseFloat(customRateCar)
      });
      await refetchSettings();
      alert("✅ Тарифы успешно обновлены!");
    } catch (err) {
      alert("Ошибка при обновлении тарифов: " + err.message);
    } finally {
      setRateSaving(false);
    }
  };

  // Action: Toggle weather surcharge
  const handleSelectWeather = async (surchargeValue) => {
    try {
      await api.post('/settings', {
        globalSurcharge: parseFloat(surchargeValue)
      });
      await refetchSettings();
    } catch (err) {
      alert("Ошибка при выборе погодных условий: " + err.message);
    }
  };

  // Action: Update Order Coefficient via Modal
  const handleUpdateOrderCoefficient = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!newCoefficient || isNaN(newCoefficient) || parseFloat(newCoefficient) < 1.0) {
      alert("Пожалуйста, введите корректный коэффициент (не менее 1.0).");
      return;
    }

    try {
      await orderServices.updateOrder(editingOrder.id, {
        coefficient: parseFloat(newCoefficient)
      });
      setEditingOrder(null);
      setNewCoefficient('');
      refetchOrders();
      alert("⚡ Коэффициент повышенного спроса успешно обновлен!");
    } catch (err) {
      alert("Не удалось обновить коэффициент спроса: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Ready for Pickup":
        return (
          <span style={{
            backgroundColor: 'rgba(255, 193, 7, 0.15)',
            color: '#ffc107',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            🟡 Ожидает
          </span>
        );
      case "Accepted":
        return (
          <span style={{
            backgroundColor: 'rgba(170, 59, 255, 0.15)',
            color: '#c480ff',
            border: '1px solid rgba(170, 59, 255, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            🟣 Принят курьером
          </span>
        );
      case "Picked Up":
      case "Delivering":
        return (
          <span style={{
            backgroundColor: 'rgba(0, 210, 106, 0.15)',
            color: '#00d26a',
            border: '1px solid rgba(0, 210, 106, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            🔵 В пути к клиенту
          </span>
        );
      case "Delivered":
        return (
          <span style={{
            backgroundColor: 'rgba(74, 144, 226, 0.15)',
            color: '#4a90e2',
            border: '1px solid rgba(74, 144, 226, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            🟢 Доставлен
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getWeatherGlow = (surcharge) => {
    if (!settings) return 'transparent';
    return settings.globalSurcharge === surcharge 
      ? (surcharge === 0 ? '0 0 15px rgba(255, 193, 7, 0.4)' : surcharge === 5 ? '0 0 15px rgba(74, 144, 226, 0.4)' : '0 0 15px rgba(255,255,255,0.4)')
      : 'none';
  };

  const isWeatherActive = (surcharge) => {
    return settings && settings.globalSurcharge === surcharge;
  };

  // Safe checks
  const safeOrders = orders || [];
  const safeSettings = settings || { pricePerKm: 4.0, globalSurcharge: 0.0 };

  // Calculate some analytics
  const pendingOrders = safeOrders.filter(o => o.status === "Ready for Pickup").length;
  const activeDeliveries = safeOrders.filter(o => o.status === "Accepted" || o.status === "Picked Up" || o.status === "Delivering").length;
  const completedDeliveries = safeOrders.filter(o => o.status === "Delivered").length;

  // Sort orders by creation time (newest first)
  const sortedOrders = [...safeOrders].sort((a, b) => {
    const timeA = a.createdAt || '';
    const timeB = b.createdAt || '';
    return timeB.localeCompare(timeA);
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #151030 0%, #0d091a 100%)',
      color: '#f3f1f6',
      padding: '40px 20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <div>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#c480ff',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Сменить роль
            </button>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '800',
              margin: 0,
              background: 'linear-gradient(to right, #ff7beb, #aa3bff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(170, 59, 255, 0.2)'
            }}>
              Панель Поддержки 🛠️
            </h1>
          </div>
          
          <div style={{
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '15px 25px',
            borderRadius: '16px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>ТЕКУЩИЕ ТАРИФЫ BE</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00d26a', marginTop: '4px' }}>
              {safeSettings.pricePerKm} PLN/км
              {safeSettings.globalSurcharge > 0 && ` (+${safeSettings.globalSurcharge} PLN надбавка)`}
            </div>
          </div>
        </div>

        {/* ANALYTICS HIGHLIGHTS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{ fontSize: '32px' }}>🟡</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{pendingOrders}</div>
              <div style={{ fontSize: '13px', opacity: 0.6 }}>Ожидают курьера</div>
            </div>
          </div>
          <div style={{
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{ fontSize: '32px' }}>🛵</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{activeDeliveries}</div>
              <div style={{ fontSize: '13px', opacity: 0.6 }}>Активные доставки</div>
            </div>
          </div>
          <div style={{
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{ fontSize: '32px' }}>🟢</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{completedDeliveries}</div>
              <div style={{ fontSize: '13px', opacity: 0.6 }}>Выполнено заказов</div>
            </div>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '30px',
          marginBottom: '40px'
        }}>
          
          {/* WEATHER MATRIX CARD */}
          <div style={{
            backdropFilter: 'blur(12px)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '30px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: 0, marginBottom: '10px' }}>
              🌦️ Погодная надбавка к цене
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '25px' }}>
              Климат немедленно меняет глобальный сбор на новые заказы. Действующие заказы могут дорожать автоматически из-за простоя.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'space-between'
            }}>
              {/* CLEAR WEATHER */}
              <button 
                onClick={() => handleSelectWeather(0)}
                style={{
                  flex: 1,
                  background: isWeatherActive(0) ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isWeatherActive(0) ? '2px solid #ffc107' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: getWeatherGlow(0),
                  color: '#fff'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>☀️</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Ясно</div>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>+0 PLN</div>
              </button>

              {/* RAIN */}
              <button 
                onClick={() => handleSelectWeather(5)}
                style={{
                  flex: 1,
                  background: isWeatherActive(5) ? 'rgba(74, 144, 226, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isWeatherActive(5) ? '2px solid #4a90e2' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: getWeatherGlow(5),
                  color: '#fff'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌧️</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Дождь</div>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>+5 PLN</div>
              </button>

              {/* SNOW */}
              <button 
                onClick={() => handleSelectWeather(10)}
                style={{
                  flex: 1,
                  background: isWeatherActive(10) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isWeatherActive(10) ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: getWeatherGlow(10),
                  color: '#fff'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>❄️</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Снегопад</div>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>+10 PLN</div>
              </button>
            </div>
          </div>

          {/* DYNAMIC RATE ADJUSTMENT CARD */}
          <div style={{
            backdropFilter: 'blur(12px)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '30px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: 0, marginBottom: '8px' }}>
                💰 Управление Тарифами Саппорта
              </h2>
              <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '20px' }}>
                Задайте базовые ставки компенсации курьерам за 1 километр для каждого типа транспорта.
              </p>
            </div>

            <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* VELO RATE ROW */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff7beb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🚲 Велосипед (Base)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCustomRateVelo(prev => Math.max(1, parseFloat(prev || 4) - 0.5).toFixed(1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    -
                  </button>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="50"
                      value={customRateVelo}
                      onChange={(e) => setCustomRateVelo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 45px 8px 10px',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '11px',
                      opacity: 0.6,
                      fontWeight: 'bold'
                    }}>
                      PLN
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomRateVelo(prev => Math.min(50, parseFloat(prev || 4) + 0.5).toFixed(1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* SCOOTER RATE ROW */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c480ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🛴 Самокат
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCustomRateScooter(prev => Math.max(1, parseFloat(prev || 5.5) - 0.5).toFixed(1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    -
                  </button>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="50"
                      value={customRateScooter}
                      onChange={(e) => setCustomRateScooter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 45px 8px 10px',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '11px',
                      opacity: 0.6,
                      fontWeight: 'bold'
                    }}>
                      PLN
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomRateScooter(prev => Math.min(50, parseFloat(prev || 5.5) + 0.5).toFixed(1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CAR RATE ROW */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#00d26a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🚗 Автомобиль
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCustomRateCar(prev => Math.max(1, parseFloat(prev || 7) - 0.5).toFixed(1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    -
                  </button>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="50"
                      value={customRateCar}
                      onChange={(e) => setCustomRateCar(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 45px 8px 10px',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '11px',
                      opacity: 0.6,
                      fontWeight: 'bold'
                    }}>
                      PLN
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomRateCar(prev => Math.min(50, parseFloat(prev || 7) + 0.5).toFixed(1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={rateSaving}
                style={{
                  width: '100%',
                  padding: '13px',
                  backgroundColor: '#aa3bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(170, 59, 255, 0.3)',
                  transition: 'opacity 0.2s',
                  marginTop: '5px'
                }}
              >
                {rateSaving ? "Сохранение..." : "💾 Сохранить тарифы"}
              </button>
            </form>
          </div>
        </div>

        {/* LIVE ORDERS CONSOLE TABLE */}
        <div style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              🔴 Диспетчерский монитор заказов
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', opacity: 0.7 }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#00d26a',
                animation: 'pulse 1.5s infinite'
              }}></span>
              Автообновление (3с)
            </div>
          </div>

          {sortedOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, fontSize: '16px' }}>
              Нет действующих заказов в системе.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)', fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 10px' }}>ID заказа</th>
                    <th style={{ padding: '12px 10px' }}>Время</th>
                    <th style={{ padding: '12px 10px' }}>Ресторан & Блюда</th>
                    <th style={{ padding: '12px 10px' }}>Курьер</th>
                    <th style={{ padding: '12px 10px' }}>Статус</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Плата</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Спрос</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.slice(0, visibleCount).map((order) => {
                    const coefficientVal = parseFloat(order.coefficient || 1.0);
                    const hasSurged = coefficientVal > 1.05;

                    return (
                      <tr 
                        key={order.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background-color 0.2s',
                          fontSize: '15px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* ORDER ID */}
                        <td style={{ padding: '18px 10px', fontWeight: 'bold' }}>
                          <span style={{ color: '#ffc107', marginRight: '4px' }}>#</span>
                          {order.id.slice(-4).toUpperCase()}
                          <span style={{ fontSize: '11px', opacity: 0.4, display: 'block', fontWeight: 'normal' }}>
                            {order.id}
                          </span>
                        </td>

                        {/* TIME */}
                        <td style={{ padding: '18px 10px', fontWeight: '500', color: '#ff7beb' }}>
                          🕒 {order.createdAt || '—'}
                        </td>

                        {/* VENUE & ITEMS */}
                        <td style={{ padding: '18px 10px' }}>
                          <div style={{ fontWeight: 'bold' }}>{order.vendorName}</div>
                          <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>{order.items}</div>
                        </td>

                        {/* ASSIGNED COURIER */}
                        <td style={{ padding: '18px 10px', opacity: order.courierId ? 1 : 0.4 }}>
                          🛵 {order.courierId ? `Курьер (${order.courierId})` : 'Не назначен'}
                        </td>

                        {/* STATUS BADGE */}
                        <td style={{ padding: '18px 10px' }}>
                          {getStatusBadge(order.status)}
                        </td>

                        {/* DELIVERY FEE */}
                        <td style={{ padding: '18px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                          {order.courierId ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                {hasSurged && (
                                  <span 
                                    title={`Повышенный спрос (коэффициент x${coefficientVal.toFixed(1)} 🔥)`} 
                                    style={{ 
                                      backgroundColor: 'rgba(255, 71, 87, 0.15)',
                                      color: '#ff4757',
                                      border: '1px solid rgba(255, 71, 87, 0.3)',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      cursor: 'help'
                                    }}
                                  >
                                    ⚡ x{coefficientVal.toFixed(1)}
                                  </span>
                                )}
                                <span style={{ color: hasSurged ? '#ff4757' : '#00d26a', fontSize: '16px' }}>
                                  {order.fee} PLN
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', opacity: 0.4, display: 'block', fontWeight: 'normal' }}>
                                Итого: {order.totalPrice} PLN
                              </span>
                            </>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span 
                                style={{ 
                                  backgroundColor: hasSurged ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                  color: hasSurged ? '#ff4757' : '#f3f1f6',
                                  border: hasSurged ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ⚡ x{coefficientVal.toFixed(1)}
                              </span>
                              <span style={{ fontSize: '10px', opacity: 0.4, marginTop: '4px', fontWeight: 'normal' }}>
                                Ожидает курьера
                              </span>
                            </div>
                          )}
                        </td>

                        {/* MANUAL PRICE OVERRIDE BUTTON */}
                        <td style={{ padding: '18px 10px', textAlign: 'center' }}>
                          {order.status === 'Ready for Pickup' ? (
                            <button
                              onClick={() => {
                                setEditingOrder(order);
                                setNewCoefficient(coefficientVal.toString());
                              }}
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#f3f1f6',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#aa3bff';
                                e.target.style.borderColor = '#aa3bff';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                              }}
                            >
                              ⚡ Спрос
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', opacity: 0.3 }}>Заблокировано</span>
                          )}
                        </td>

                        {/* DETAILS BUTTON */}
                        <td style={{ padding: '18px 10px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#f3f1f6',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.backgroundColor = '#aa3bff';
                              e.target.style.borderColor = '#aa3bff';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                          >
                            👁️ Детали
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* PAGINATION LOAD MORE */}
              {sortedOrders.length > visibleCount && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    style={{
                      backgroundColor: 'rgba(170, 59, 255, 0.1)',
                      border: '1px solid rgba(170, 59, 255, 0.3)',
                      color: '#c480ff',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(170, 59, 255, 0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(170, 59, 255, 0.2)';
                      e.target.style.border = '1px solid rgba(170, 59, 255, 0.5)';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(170, 59, 255, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(170, 59, 255, 0.1)';
                      e.target.style.border = '1px solid rgba(170, 59, 255, 0.3)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(170, 59, 255, 0.1)';
                    }}
                  >
                    🔽 Показать еще (+10)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* OVERLAY MODAL FOR CUSTOM ORDER FEE EDIT */}
      {/* OVERLAY MODAL FOR CUSTOM ORDER COEFFICIENT ADJUSTMENT */}
      {editingOrder && (() => {
        const pricePerKm = safeSettings.pricePerKm !== undefined ? safeSettings.pricePerKm : 4.0;
        const scooterPricePerKm = safeSettings.scooterPricePerKm !== undefined ? safeSettings.scooterPricePerKm : 5.5;
        const carPricePerKm = safeSettings.carPricePerKm !== undefined ? safeSettings.carPricePerKm : 7.0;
        const surcharge = safeSettings.globalSurcharge !== undefined ? safeSettings.globalSurcharge : 0.0;
        const distance = parseFloat(editingOrder.distance) || 0.0;
        const coeff = parseFloat(newCoefficient) || 1.0;

        const veloPayout = Math.max(5.0, Math.round((distance * pricePerKm + surcharge) * coeff));
        const scooterPayout = Math.max(5.0, Math.round((distance * scooterPricePerKm + surcharge) * coeff));
        const carPayout = Math.max(5.0, Math.round((distance * carPricePerKm + surcharge) * coeff));

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 5, 20, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            zIndex: 1000
          }}>
            <div style={{
              backdropFilter: 'blur(20px)',
              background: 'rgba(28, 20, 48, 0.98)',
              border: '1px solid rgba(170, 59, 255, 0.3)',
              padding: '35px',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 15px 45px rgba(170, 59, 255, 0.25)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0, marginBottom: '15px', color: '#ff4757', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Настройка повышенного спроса
              </h3>
              
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                <div><strong>Ресторан:</strong> {editingOrder.vendorName}</div>
                <div style={{ marginTop: '5px' }}><strong>Адрес клиента:</strong> {editingOrder.deliveryAddress}</div>
                <div style={{ marginTop: '5px' }}><strong>Дистанция:</strong> {editingOrder.distance} км</div>
              </div>

              <form onSubmit={handleUpdateOrderCoefficient}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', opacity: 0.7, fontWeight: 'bold' }}>
                    КОЭФФИЦИЕНТ СПРОСА:
                  </label>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#ff4757' }}>
                    x{coeff.toFixed(1)}
                  </span>
                </div>

                {/* SLIDER */}
                <input 
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={newCoefficient}
                  onChange={(e) => setNewCoefficient(e.target.value)}
                  style={{
                    width: '100%',
                    marginBottom: '15px',
                    accentColor: '#ff4757',
                    cursor: 'pointer'
                  }}
                />

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {/* PRESETS */}
                  {['1.0', '1.5', '2.0', '3.0'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewCoefficient(preset)}
                      style={{
                        flex: 1,
                        backgroundColor: coeff.toFixed(1) === parseFloat(preset).toFixed(1) ? 'rgba(255, 71, 87, 0.2)' : 'rgba(255,255,255,0.06)',
                        color: coeff.toFixed(1) === parseFloat(preset).toFixed(1) ? '#ff4757' : '#fff',
                        border: coeff.toFixed(1) === parseFloat(preset).toFixed(1) ? '1px solid rgba(255, 71, 87, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>

                {/* PAYOUT PROJECTIONS */}
                <div style={{
                  background: 'rgba(170, 59, 255, 0.05)',
                  border: '1px solid rgba(170, 59, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#c480ff', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    💰 Прогноз выплат курьерам:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                      <span>🚲 Велосипед (Base)</span>
                      <strong style={{ color: '#fff' }}>{veloPayout} PLN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                      <span>🛴 Самокат (+rate)</span>
                      <strong style={{ color: '#fff' }}>{scooterPayout} PLN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🚗 Автомобиль (+rate)</span>
                      <strong style={{ color: '#fff' }}>{carPayout} PLN</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#ff4757',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(255, 71, 87, 0.3)'
                    }}
                  >
                    Применить
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* OVERLAY MODAL FOR FULL ORDER DETAILS VIEW */}
      {selectedOrderDetails && (() => {
        const order = selectedOrderDetails;
        const coefficientVal = parseFloat(order.coefficient || 1.0);
        const hasSurged = coefficientVal > 1.05;
        
        const pricePerKm = safeSettings.pricePerKm !== undefined ? safeSettings.pricePerKm : 4.0;
        const scooterPricePerKm = safeSettings.scooterPricePerKm !== undefined ? safeSettings.scooterPricePerKm : 5.5;
        const carPricePerKm = safeSettings.carPricePerKm !== undefined ? safeSettings.carPricePerKm : 7.0;
        const surcharge = safeSettings.globalSurcharge !== undefined ? safeSettings.globalSurcharge : 0.0;
        const distance = parseFloat(order.distance) || 0.0;

        const veloPayout = Math.max(5.0, Math.round((distance * pricePerKm + surcharge) * coefficientVal));
        const scooterPayout = Math.max(5.0, Math.round((distance * scooterPricePerKm + surcharge) * coefficientVal));
        const carPayout = Math.max(5.0, Math.round((distance * carPricePerKm + surcharge) * coefficientVal));

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 5, 20, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            zIndex: 1000
          }}>
            <div style={{
              backdropFilter: 'blur(20px)',
              background: 'rgba(28, 20, 48, 0.98)',
              border: '1px solid rgba(170, 59, 255, 0.3)',
              padding: '35px',
              borderRadius: '24px',
              width: '90%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 15px 45px rgba(170, 59, 255, 0.25)',
              position: 'relative'
            }}>
              {/* CLOSE BUTTON AT TOP RIGHT */}
              <button
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.target.style.opacity = 1}
                onMouseOut={(e) => e.target.style.opacity = 0.6}
              >
                ×
              </button>

              {/* HEADER */}
              <div style={{ marginBottom: '25px' }}>
                <span style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  color: '#ff7beb',
                  letterSpacing: '1px',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  ПОЛНАЯ ИНФОРМАЦИЯ О ЗАКАЗЕ
                </span>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  margin: 0,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  #{order.id.toUpperCase()}
                </h3>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {getStatusBadge(order.status)}
                  <span style={{ fontSize: '13px', opacity: 0.6 }}>
                    Дистанция: 📏 {order.distance} км
                  </span>
                </div>
              </div>

              {/* TWO-COLUMN GRID */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '25px',
                marginBottom: '25px'
              }}>
                {/* COLUMN 1: VENDOR & BASKET */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '20px',
                  borderRadius: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#c480ff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                    🏬 Заведение & Блюда
                  </h4>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {order.vendorName}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    opacity: 0.8,
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '10px',
                    borderRadius: '8px'
                  }}>
                    {order.items}
                  </div>
                  {order.courierId && (
                    <div style={{ marginTop: '15px', fontSize: '13px', opacity: 0.8 }}>
                      🛵 <strong>Курьер:</strong> {order.courierId}
                    </div>
                  )}
                </div>

                {/* COLUMN 2: CLIENT INFO */}
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '20px',
                  borderRadius: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#c480ff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                    📍 Адрес & Контакты получателя
                  </h4>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                    Адрес: {order.deliveryAddress}
                  </div>

                  {/* Address parameters grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '13px',
                    marginBottom: '12px'
                  }}>
                    <div>🏠 <strong>Дом:</strong> {order.house || '—'}</div>
                    <div>🚪 <strong>Кв./офис:</strong> {order.apartment || '—'}</div>
                    <div>🏢 <strong>Этаж:</strong> {order.floor || '—'}</div>
                    <div>📞 <strong>Телефон:</strong> {order.phone || '—'}</div>
                  </div>

                  {order.notes && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      backgroundColor: 'rgba(255, 193, 7, 0.08)',
                      border: '1px solid rgba(255, 193, 7, 0.2)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#ffc107',
                      fontStyle: 'italic'
                    }}>
                      <strong>Примечание:</strong> "{order.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM SECTION: PRICE & DYNAMIC PAYOUT COMPARISONS */}
              <div style={{
                background: 'rgba(170, 59, 255, 0.05)',
                border: '1px solid rgba(170, 59, 255, 0.15)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '25px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '15px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#c480ff', letterSpacing: '0.5px' }}>
                      ФИНАНСОВЫЙ СТАТУС ЗАКАЗА
                    </span>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>
                      Коэффициент спроса: <span style={{ color: '#ff4757' }}>⚡ x{coefficientVal.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {order.courierId ? (
                      <>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#00d26a' }}>
                          {order.fee} PLN (доставка)
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>
                          Итого: {order.totalPrice} PLN
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '13px', opacity: 0.7, color: '#ffc107', fontStyle: 'italic', fontWeight: '500' }}>
                        ⚠️ Финансовые детали скрыты до назначения курьера
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#c480ff', marginBottom: '10px', letterSpacing: '0.5px' }}>
                  💸 Прогноз выплат курьерам (с коэф. спроса):
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '15px'
                }}>
                  {/* VELO */}
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '12px',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🚲</span>
                    <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'bold' }}>ВЕЛОСИПЕД</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px', color: '#fff' }}>
                      {veloPayout} PLN
                    </div>
                    <span style={{ fontSize: '10px', opacity: 0.4 }}>
                      {pricePerKm} PLN/км
                    </span>
                  </div>

                  {/* SCOOTER */}
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '12px',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🛴</span>
                    <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'bold' }}>САМОКАТ</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px', color: '#fff' }}>
                      {scooterPayout} PLN
                    </div>
                    <span style={{ fontSize: '10px', opacity: 0.4 }}>
                      {scooterPricePerKm} PLN/км
                    </span>
                  </div>

                  {/* CAR */}
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '12px',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🚗</span>
                    <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'bold' }}>АВТОМОБИЛЬ</span>
                    <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px', color: '#fff' }}>
                      {carPayout} PLN
                    </div>
                    <span style={{ fontSize: '10px', opacity: 0.4 }}>
                      {carPricePerKm} PLN/км
                    </span>
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#aa3bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(170, 59, 255, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KEYFRAME ANIMATIONS FOR THE LIVE BADGE */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(0, 210, 106, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(0, 210, 106, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(0, 210, 106, 0);
          }
        }
      `}} />
    </div>
  );
}

// src/pages/Admin/components/SettingsPanel.jsx
import React from 'react';

export default function SettingsPanel({
  settings,
  customRateVelo,
  setCustomRateVelo,
  customRateScooter,
  setCustomRateScooter,
  customRateCar,
  setCustomRateCar,
  handleSaveRate,
  handleSelectWeather,
  rateSaving
}) {
  if (!settings) return null;

  const isWeatherActive = (surcharge) => {
    return settings.globalSurcharge === surcharge;
  };

  const getWeatherGlow = (surcharge) => {
    return settings.globalSurcharge === surcharge 
      ? (surcharge === 0 ? '0 0 15px rgba(255, 193, 7, 0.4)' : surcharge === 5 ? '0 0 15px rgba(74, 144, 226, 0.4)' : '0 0 15px rgba(255,255,255,0.4)')
      : 'none';
  };

  return (
    <div className="support-glass-card" style={{ marginBottom: '40px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        ⚙️ Глобальное управление тарифами
      </h2>
      
      <form onSubmit={handleSaveRate} className="settings-rates-form">
        
        {/* Dynamic rate grids */}
        <div className="price-inputs-grid">
          
          {/* Bicycle Rate */}
          <div className="price-rate-item-box">
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🚲 Велосипед (Ставка)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => setCustomRateVelo(prev => { const val = parseFloat(prev); return isNaN(val) ? '4.0' : Math.max(1, val - 0.5).toFixed(1); })}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
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
                    width: '100%', padding: '8px 10px', backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
                    color: '#fff', fontSize: '16px', fontWeight: 'bold', textAlign: 'center'
                  }}
                />
              </div>
              <button 
                type="button" 
                onClick={() => setCustomRateVelo(prev => { const val = parseFloat(prev); return isNaN(val) ? '4.0' : (val + 0.5).toFixed(1); })}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>PLN за 1 км пути</span>
          </div>

          {/* Scooter Rate */}
          <div className="price-rate-item-box">
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🛴 Самокат (Ставка)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => setCustomRateScooter(prev => { const val = parseFloat(prev); return isNaN(val) ? '5.5' : Math.max(1, val - 0.5).toFixed(1); })}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
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
                    width: '100%', padding: '8px 10px', backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
                    color: '#fff', fontSize: '16px', fontWeight: 'bold', textAlign: 'center'
                  }}
                />
              </div>
              <button 
                type="button" 
                onClick={() => setCustomRateScooter(prev => { const val = parseFloat(prev); return isNaN(val) ? '5.5' : (val + 0.5).toFixed(1); })}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>PLN за 1 км пути</span>
          </div>

          {/* Car Rate */}
          <div className="price-rate-item-box">
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🚗 Машина (Ставка)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => setCustomRateCar(prev => { const val = parseFloat(prev); return isNaN(val) ? '7.0' : Math.max(1, val - 0.5).toFixed(1); })}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
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
                    width: '100%', padding: '8px 10px', backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
                    color: '#fff', fontSize: '16px', fontWeight: 'bold', textAlign: 'center'
                  }}
                />
              </div>
              <button 
                type="button" 
                onClick={() => setCustomRateCar(prev => { const val = parseFloat(prev); return isNaN(val) ? '7.0' : (val + 0.5).toFixed(1); })}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>PLN за 1 км пути</span>
          </div>

        </div>

        {/* Global Weather modifier */}
        <div style={{
          marginTop: '5px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>🌧️ Погодные условия в Познани</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Влияет на надбавки к стоимости доставок</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleSelectWeather(0)}
              style={{
                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                border: isWeatherActive(0) ? '1px solid #ffcc00' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: isWeatherActive(0) ? 'rgba(255, 204, 0, 0.15)' : 'rgba(255,255,255,0.02)',
                color: isWeatherActive(0) ? '#ffcc00' : 'rgba(255,255,255,0.7)',
                boxShadow: getWeatherGlow(0), transition: 'all 0.3s'
              }}
            >
              ☀️ Ясно (+0 PLN)
            </button>
            <button
              type="button"
              onClick={() => handleSelectWeather(5)}
              style={{
                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                border: isWeatherActive(5) ? '1px solid #4a90e2' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: isWeatherActive(5) ? 'rgba(74, 144, 226, 0.15)' : 'rgba(255,255,255,0.02)',
                color: isWeatherActive(5) ? '#4a90e2' : 'rgba(255,255,255,0.7)',
                boxShadow: getWeatherGlow(5), transition: 'all 0.3s'
              }}
            >
              🌧️ Дождь (+5 PLN)
            </button>
            <button
              type="button"
              onClick={() => handleSelectWeather(10)}
              style={{
                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
                border: isWeatherActive(10) ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: isWeatherActive(10) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                color: isWeatherActive(10) ? '#ffffff' : 'rgba(255,255,255,0.7)',
                boxShadow: getWeatherGlow(10), transition: 'all 0.3s'
              }}
            >
              ❄️ Снегопад (+10 PLN)
            </button>
          </div>
        </div>

        {/* Submit rates */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button 
            type="submit" 
            disabled={rateSaving}
            className="btn-admin-save"
          >
            {rateSaving ? 'Сохранение...' : '💾 Применить тарифные сетки'}
          </button>
        </div>

      </form>
    </div>
  );
}

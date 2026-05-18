import React from 'react';

function Header({ address }) {
  return (
    <header className="main-header">
      <div className="header-address">{address || 'Загрузка адреса...'}</div>
      
      <div className="header-search">
        <input type="text" placeholder="Поиск ресторанов..." />
        <span className="search-icon">🔍</span>
      </div>
      
      <div className="header-profile">
        <div className="profile-icon">👤</div>
      </div>
    </header>
  );
}

export default Header;


function Header({ address, searchTerm, setSearchTerm, onProfileClick }) {
  return (
    <header className="main-header">
      <div className="header-address">{address || 'Загрузка адреса…'}</div>
      
      {setSearchTerm && (
        <div className="header-search">
          <input 
            type="text" 
            placeholder="Поиск ресторанов…" 
            aria-label="Поиск ресторанов" 
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon" aria-hidden="true">🔍</span>
        </div>
      )}
      
      <div className="header-profile">
        <button 
          className="profile-icon" 
          aria-label="Профиль пользователя"
          style={{ background: 'none', border: 'none' }}
          onClick={onProfileClick}
        >
          👤
        </button>
      </div>
    </header>
  );
}

export default Header;

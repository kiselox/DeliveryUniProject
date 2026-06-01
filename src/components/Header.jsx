
function Header({ address, searchTerm, setSearchTerm, onProfileClick }) {
  return (
    <header className="main-header">
      <div className="header-address">{address || 'Loading address...'}</div>
      
      {setSearchTerm && (
        <div className="header-search">
          <input 
            type="text" 
            placeholder="Search restaurants..." 
            aria-label="Search restaurants" 
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon" aria-hidden="true">🔍</span>
        </div>
      )}
      
      <div className="header-profile">
        <button 
          className="profile-icon" 
          aria-label="User Profile"
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

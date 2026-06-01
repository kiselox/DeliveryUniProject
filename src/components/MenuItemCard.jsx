import { FALLBACK_MENU_ITEM } from '../utils/imageFallbacks';

function MenuItemCard({ item, quantity, onAdd, onRemove }) {
  return (
    <div className="menu-item-card-figma">
      <div className="menu-item-image-wrapper" style={{ position: 'relative' }}>
         <img 
           src={item.imageUrl || FALLBACK_MENU_ITEM} 
           alt={item.name} 
           className="menu-item-image"
           onError={(e) => {
             e.target.onerror = null;
             e.target.src = FALLBACK_MENU_ITEM;
           }}
         />
         {(item.isVegan || item.isSpicy) && (
           <div className="menu-item-badges">
             {item.isVegan && <span className="badge-diet vegan">Vegan 🍃</span>}
             {item.isSpicy && <span className="badge-diet spicy">Spicy 🌶️</span>}
           </div>
         )}
      </div>
      <div className="menu-item-info">
        <div className="menu-item-header-row">
          <strong className="menu-item-name">{item.name}</strong>
          <span className="menu-item-price">{item.price} PLN</span>
        </div>
        {item.description && (
          <p className="menu-item-description">{item.description}</p>
        )}
      </div>
      
      {quantity > 0 ? (
        <div className="quantity-controls">
          <button className="btn-qty" onClick={onRemove}>-</button>
          <span className="qty-value">{quantity}</span>
          <button className="btn-qty" onClick={onAdd}>+</button>
        </div>
      ) : (
        <button className="btn-add-cart" onClick={onAdd}>
          Add to Cart
        </button>
      )}
    </div>
  );
}

export default MenuItemCard;

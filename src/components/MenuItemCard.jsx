import React from 'react';

function MenuItemCard({ item, quantity, onAdd, onRemove }) {
  return (
    <div className="menu-item-card-figma">
      <div className="menu-item-image-wrapper">
         <img 
           src={item.imageUrl || `https://placehold.co/300x200/eee/333?text=${item.name.replace(/\s+/g, '+')}`} 
           alt={item.name} 
           className="menu-item-image"
         />
      </div>
      <div className="menu-item-info">
        <strong className="menu-item-name">{item.name}</strong> 
        <div className="menu-item-price">{item.price} PLN</div>
      </div>
      
      {quantity > 0 ? (
        <div className="quantity-controls">
          <button className="btn-qty" onClick={onRemove}>-</button>
          <span className="qty-value">{quantity}</span>
          <button className="btn-qty" onClick={onAdd}>+</button>
        </div>
      ) : (
        <button className="btn-add-cart" onClick={onAdd}>
          Добавить
        </button>
      )}
    </div>
  );
}

export default MenuItemCard;

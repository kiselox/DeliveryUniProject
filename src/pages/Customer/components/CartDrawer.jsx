// src/pages/Customer/components/CartDrawer.jsx
import React from 'react';
import MenuItemCard from '../../../components/MenuItemCard';
import AddressMapPicker from './AddressMapPicker';
import CheckoutForm from './CheckoutForm';

export default function CartDrawer({
  isCartOpen,
  setIsCartOpen,
  cartItemsData,
  cart,
  handleAddToCart,
  handleRemoveFromCart,
  totalFoodPrice,
  deliveryAddress,
  setDeliveryAddress,
  deliveryLat,
  setDeliveryLat,
  deliveryLng,
  setDeliveryLng,
  mapContainerRef,
  handleGetCurrentPosition,
  handlePresetClick,
  house,
  setHouse,
  apartment,
  setApartment,
  floor,
  setFloor,
  phone,
  setPhone,
  notes,
  setNotes,
  handleCheckout,
  isPending
}) {
  if (!isCartOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ваша Корзина</h2>
          <button className="btn-close" onClick={() => setIsCartOpen(false)}>×</button>
        </div>
        
        {cartItemsData.length === 0 ? (
          <p>Ваша корзина пуста.</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {cartItemsData.map(item => (
                <MenuItemCard 
                  key={`cart-${item.id}`} 
                  item={item} 
                  quantity={cart[item.id]}
                  onAdd={() => handleAddToCart(item)} 
                  onRemove={() => handleRemoveFromCart(item)}
                />
              ))}
            </div>
            
            <div className="modal-total">
              <div>Стоимость блюд: {totalFoodPrice} PLN</div>
              <div style={{ color: '#888', fontSize: '14px' }}>Доставка рассчитывается при отправке (4 PLN/км)</div>
              <div style={{ marginTop: '10px', fontSize: '24px', color: 'var(--green)' }}>
                Итого (без доставки): {totalFoodPrice} PLN
              </div>
            </div>

            {/* Geolocation Map Picker */}
            <AddressMapPicker 
              deliveryAddress={deliveryAddress}
              setDeliveryAddress={setDeliveryAddress}
              deliveryLat={deliveryLat}
              deliveryLng={deliveryLng}
              mapContainerRef={mapContainerRef}
              handleGetCurrentPosition={handleGetCurrentPosition}
              handlePresetClick={handlePresetClick}
            />

            {/* Address Details & Phone Form */}
            <CheckoutForm 
              house={house}
              setHouse={setHouse}
              apartment={apartment}
              setApartment={setApartment}
              floor={floor}
              setFloor={setFloor}
              phone={phone}
              setPhone={setPhone}
              notes={notes}
              setNotes={setNotes}
            />

            <button 
              className="btn-confirm-order" 
              onClick={handleCheckout}
              disabled={isPending}
              style={{ marginTop: '20px' }}
            >
              {isPending ? 'Оформляем заказ...' : 'Подтвердить заказ'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { useRef } from 'react';
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
  deliveryLng,
  mapContainerRef,
  handleGetCurrentPosition,
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
  const overlayRef = useRef(false);

  if (!isCartOpen) return null;

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      overlayRef.current = true;
    }
  };

  const handleOverlayMouseUp = (e) => {
    if (overlayRef.current && e.target === e.currentTarget) {
      setIsCartOpen(false);
    }
    overlayRef.current = false;
  };

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={handleOverlayMouseDown} 
      onMouseUp={handleOverlayMouseUp}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'hidden',
          padding: 0
        }}
      >
        <div 
          className="modal-header"
          style={{
            padding: '25px 30px 15px',
            borderBottom: '2px solid #f0f0f0',
            margin: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '28px' }}>Your Cart</h2>
          <button className="btn-close" onClick={() => setIsCartOpen(false)}>×</button>
        </div>
        
        <div 
          className="modal-body"
          style={{
            padding: '20px 30px 30px',
            overflowY: 'scroll',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {cartItemsData.length === 0 ? (
            <p>Your cart is empty.</p>
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
              
              <div className="modal-total" style={{ margin: '10px 0', paddingTop: '15px' }}>
                <div>Subtotal: {totalFoodPrice} PLN</div>
                <div style={{ color: '#888', fontSize: '14px' }}>Delivery is calculated at checkout (4 PLN/km)</div>
                <div style={{ marginTop: '10px', fontSize: '24px', color: 'var(--green)' }}>
                  Total (excluding delivery): {totalFoodPrice} PLN
                </div>
              </div>

              {}
              <AddressMapPicker 
                deliveryAddress={deliveryAddress}
                setDeliveryAddress={setDeliveryAddress}
                deliveryLat={deliveryLat}
                deliveryLng={deliveryLng}
                mapContainerRef={mapContainerRef}
                handleGetCurrentPosition={handleGetCurrentPosition}
              />

              {}
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
                {isPending ? 'Placing order...' : 'Confirm Order'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

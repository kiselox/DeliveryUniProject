import { useNavigate } from 'react-router';
import { FALLBACK_RESTAURANT_IMAGE } from '../utils/imageFallbacks';

function RestaurantCard({ vendor, customerId }) {
  const navigate = useNavigate();

  return (
    <div 
      className="restaurant-card" 
      onClick={() => navigate(`/customer/${customerId}/vendor/${vendor.id}`)}
    >
      <div className="restaurant-image-wrapper" style={{ position: 'relative' }}>
        <img 
          src={vendor.imageUrl || FALLBACK_RESTAURANT_IMAGE} 
          alt={vendor.name} 
          className="restaurant-image" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = FALLBACK_RESTAURANT_IMAGE;
          }}
        />
        {vendor.rating && (
          <div className="restaurant-rating-badge">
            ⭐ {vendor.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="restaurant-card-content">
        <div className="restaurant-name">{vendor.name}</div>
        <div className="restaurant-cuisine">{vendor.cuisine}</div>
        <div className="restaurant-meta">
          {vendor.deliveryTime && (
            <span className="restaurant-time">
              🕒 {vendor.deliveryTime}
            </span>
          )}
          {vendor.priceLevel && (
            <span className="restaurant-price-level">
              {vendor.priceLevel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RestaurantCard;

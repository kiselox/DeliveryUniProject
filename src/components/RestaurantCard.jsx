import React from 'react';
import { useNavigate } from 'react-router';

function RestaurantCard({ vendor, customerId }) {
  const navigate = useNavigate();

  return (
    <div 
      className="restaurant-card" 
      onClick={() => navigate(`/customer/${customerId}/vendor/${vendor.id}`)}
    >
      <div className="restaurant-image-wrapper">
        <img src={vendor.imageUrl} alt={vendor.name} className="restaurant-image" />
      </div>
      <div className="restaurant-name">{vendor.name}</div>
    </div>
  );
}

export default RestaurantCard;

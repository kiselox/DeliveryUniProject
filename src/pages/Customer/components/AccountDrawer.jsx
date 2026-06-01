import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import customerServices from '../../../services/customer-services';
import { useOrders } from '../../../hooks/useOrders';

export default function AccountDrawer({ isOpen, onClose, customerId }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const overlayRef = useRef(false);

  const [ratingOrderId, setRatingOrderId] = useState(null);
  const [tempCourierRating, setTempCourierRating] = useState(0);
  const [tempCourierHover, setTempCourierHover] = useState(0);
  const [tempRestaurantRating, setTempRestaurantRating] = useState(0);
  const [tempRestaurantHover, setTempRestaurantHover] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      overlayRef.current = true;
    }
  };

  const handleOverlayMouseUp = (e) => {
    if (overlayRef.current && e.target === e.currentTarget) {
      onClose();
    }
    overlayRef.current = false;
  };

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerServices.getCustomerById(customerId),
    enabled: isOpen && !!customerId
  });

  const { orders = [], updateOrder } = useOrders();
  
  const clientOrders = orders
    .filter(o => o.customerId === customerId)
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      
      if (isNaN(timeA) || isNaN(timeB)) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return timeB - timeA;
    });

  const formatOrderDateTime = (createdAt) => {
    if (!createdAt) return 'Not specified';
    if (!createdAt.includes('T')) {
      return createdAt;
    }
    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return createdAt;
      
      const datePart = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timePart = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${datePart} • ${timePart}`;
    } catch {
      return createdAt;
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    phone: '',
    address: '',
    house: '',
    apartment: '',
    floor: '',
    notes: '',
    password: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (customer && !hasInitializedRef.current) {
      setTimeout(() => {
        setFormData({
          name: customer.name || '',
          lastName: customer.lastName || '',
          phone: customer.phone || '',
          address: customer.address || '',
          house: customer.house || '',
          apartment: customer.apartment || '',
          floor: customer.floor || '',
          notes: customer.notes || '',
          password: ''
        });
      }, 0);
      hasInitializedRef.current = true;
    }
  }, [customer]);

  const updateCustomerMutation = useMutation({
    mutationFn: (updates) => customerServices.updateCustomer(customerId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setSaveSuccess(true);
      setSaveError('');
      setFormData(prev => ({ ...prev, password: '' }));
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      setSaveError(err.response?.data?.error || err.message || 'Save error');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.lastName.trim() || !formData.phone.trim() || !formData.address.trim()) {
      setSaveError('All fields are required!');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setSaveError('New password must be at least 6 characters long!');
      return;
    }

    const payload = { ...formData };
    if (!payload.password) {
      delete payload.password;
    }

    updateCustomerMutation.mutate(payload);
  };

  const handleReorder = (order) => {
    localStorage.setItem('reorder_vendor_id', order.vendorId);
    localStorage.setItem('reorder_items', order.items);
    onClose();
    
    navigate(`/customer/${customerId}/vendor/${order.vendorId}`);
  };

  const handleSupportClick = (order) => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-support-chat', {
        detail: {
          orderId: order.id
        }
      }));
    }, 150);
  };

  const handleRatingSubmit = async (orderId) => {
    if (!tempCourierRating && !tempRestaurantRating) return;
    setIsSubmittingRating(true);
    try {
      await updateOrder({
        orderId,
        updates: {
          ratingCourier: tempCourierRating || null,
          ratingRestaurant: tempRestaurantRating || null
        }
      });
      setRatingOrderId(null);
      setTempCourierRating(0);
      setTempRestaurantRating(0);
    } catch (err) {
      console.error('Failed to save rating:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'New': { text: 'Processing', class: 'new' },
      'Preparing': { text: 'Preparing', class: 'preparing' },
      'Ready for Pickup': { text: 'Ready for Pickup', class: 'ready' },
      'Delivering': { text: 'Delivering', class: 'delivering' },
      'Delivered': { text: 'Delivered', class: 'delivered' },
      'Cancelled': { text: 'Cancelled', class: 'cancelled' }
    };
    const info = statusMap[status] || { text: status, class: 'new' };
    return <span className={`order-status-badge ${info.class}`}>{info.text}</span>;
  };

  return (
    <div 
      className={`account-drawer-overlay ${isOpen ? 'open' : ''}`} 
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <div 
        className="account-drawer" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="account-drawer-header">
          <h2 className="account-drawer-title">Personal Account</h2>
          <button className="account-drawer-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="account-drawer-tabs">
          <button 
            className={`account-drawer-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 My Orders
          </button>
          <button 
            className={`account-drawer-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>

        <div className="account-drawer-content">
          {activeTab === 'orders' ? (
            <div className="orders-history-list">
              {clientOrders.length === 0 ? (
                <div className="no-orders-msg">
                  <p style={{ fontSize: '32px', marginBottom: '12px' }}>🍕</p>
                  <h4>Order history is empty</h4>
                  <p>Place your first order at any of our restaurants!</p>
                </div>
              ) : (
                clientOrders.map(order => (
                  <div key={order.id} className="history-order-card">
                    <div className="order-card-header">
                      <div>
                        <div className="order-card-vendor">{order.vendorName}</div>
                        <div className="order-card-date">Order No. {order.id} • {formatOrderDateTime(order.createdAt)}</div>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="order-card-items">
                      {order.items.split(', ').map((item, idx) => (
                        <div key={idx} className="order-card-item">
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-card-footer">
                      <div className="order-card-total">Total: {order.totalPrice} PLN</div>
                      <div className="order-card-actions" style={{ display: 'flex', gap: '8px' }}>
                        {order.status === 'Delivered' && !order.ratingCourier && !order.ratingRestaurant && (
                          <button
                            className="btn-rate-order"
                            onClick={() => {
                              setRatingOrderId(order.id);
                              setTempCourierRating(0);
                              setTempRestaurantRating(0);
                            }}
                          >
                            Rate
                          </button>
                        )}
                        <button 
                          className="btn-order-support"
                          onClick={() => handleSupportClick(order)}
                        >
                          Support
                        </button>
                        <button 
                          className="btn-reorder"
                          onClick={() => handleReorder(order)}
                        >
                          Reorder
                        </button>
                      </div>
                    </div>

                    {}
                    {order.status === 'Delivered' && (order.ratingCourier || order.ratingRestaurant) ? (
                      <div className="order-ratings-display">
                        {order.ratingCourier && (
                          <div className="rating-badge">
                            <span className="rating-badge-label">🛵 Courier:</span>
                            <span className="rating-badge-stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < order.ratingCourier ? "star-gold" : "star-gray"}>★</span>
                              ))}
                            </span>
                          </div>
                        )}
                        {order.ratingRestaurant && (
                          <div className="rating-badge">
                            <span className="rating-badge-label">🏢 Restaurant:</span>
                            <span className="rating-badge-stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < order.ratingRestaurant ? "star-gold" : "star-gray"}>★</span>
                              ))}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {}
                    {ratingOrderId === order.id && (
                      <div className="order-rating-panel">
                        <div className="rating-panel-header">
                          <span className="rating-panel-title">Rate your order</span>
                        </div>
                        
                        <div className="rating-row">
                          <span className="rating-row-label">🛵 Courier:</span>
                          <div className="star-rating-input">
                            {Array.from({ length: 5 }).map((_, idx) => {
                              const starValue = idx + 1;
                              const isActive = (tempCourierHover || tempCourierRating) >= starValue;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`star-btn ${isActive ? 'active' : ''}`}
                                  onMouseEnter={() => setTempCourierHover(starValue)}
                                  onMouseLeave={() => setTempCourierHover(0)}
                                  onClick={() => setTempCourierRating(starValue)}
                                  aria-label={`Rate courier ${starValue} stars`}
                                >
                                  ★
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rating-row">
                          <span className="rating-row-label">🏢 Restaurant:</span>
                          <div className="star-rating-input">
                            {Array.from({ length: 5 }).map((_, idx) => {
                              const starValue = idx + 1;
                              const isActive = (tempRestaurantHover || tempRestaurantRating) >= starValue;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`star-btn ${isActive ? 'active' : ''}`}
                                  onMouseEnter={() => setTempRestaurantHover(starValue)}
                                  onMouseLeave={() => setTempRestaurantHover(0)}
                                  onClick={() => setTempRestaurantRating(starValue)}
                                  aria-label={`Rate restaurant ${starValue} stars`}
                                >
                                  ★
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="rating-panel-actions">
                          <button
                            type="button"
                            className="btn-rating-cancel"
                            onClick={() => {
                              setRatingOrderId(null);
                              setTempCourierRating(0);
                              setTempRestaurantRating(0);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-rating-submit"
                            disabled={(!tempCourierRating && !tempRestaurantRating) || isSubmittingRating}
                            onClick={() => handleRatingSubmit(order.id)}
                          >
                            {isSubmittingRating ? '...' : 'Submit'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="account-settings-form">
              {isLoadingCustomer ? (
                <div>Loading profile...</div>
              ) : (
                <>
                  <div className="account-form-group">
                    <label className="account-form-label">First Name</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="account-form-input" 
                      placeholder="First Name"
                      required
                    />
                  </div>

                  <div className="account-form-group">
                    <label className="account-form-label">Last Name</label>
                    <input 
                      type="text" 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="account-form-input" 
                      placeholder="Last Name"
                      required
                    />
                  </div>

                  <div className="account-form-group">
                    <label className="account-form-label">Email (Used as login)</label>
                    <input 
                      type="email" 
                      value={customer?.email || ''} 
                      className="account-form-input" 
                      disabled
                    />
                  </div>

                  <div className="account-form-group">
                    <label className="account-form-label">Phone</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="account-form-input" 
                      placeholder="+48 000 000 000"
                      required
                    />
                  </div>

                  <div className="account-form-group">
                    <label className="account-form-label">Delivery Address</label>
                    <input 
                      type="text" 
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="account-form-input" 
                      placeholder="Street, city"
                      required
                    />
                  </div>

                  {}
                  <div className="checkout-grid-3col">
                    <div className="account-form-group">
                      <label className="account-form-label">House/Building</label>
                      <input 
                        type="text" 
                        name="house"
                        value={formData.house}
                        onChange={handleInputChange}
                        className="account-form-input" 
                        placeholder="House 12"
                      />
                    </div>
                    <div className="account-form-group">
                      <label className="account-form-label">Apartment</label>
                      <input 
                        type="text" 
                        name="apartment"
                        value={formData.apartment}
                        onChange={handleInputChange}
                        className="account-form-input" 
                        placeholder="Apt 45"
                      />
                    </div>
                    <div className="account-form-group">
                      <label className="account-form-label">Floor</label>
                      <input 
                        type="text" 
                        name="floor"
                        value={formData.floor}
                        onChange={handleInputChange}
                        className="account-form-input" 
                        placeholder="3rd floor"
                      />
                    </div>
                  </div>

                  <div className="account-form-group">
                    <label className="account-form-label">Note to Courier</label>
                    <textarea 
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="account-form-input" 
                      placeholder="e.g., Leave at the door, intercom doesn't work..."
                      style={{ height: '60px', resize: 'vertical' }}
                    />
                  </div>

                  <div className="account-form-group">
                    <label className="account-form-label">New password (leave blank to keep unchanged)</label>
                    <input 
                      type="password" 
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="account-form-input" 
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  {saveSuccess && (
                    <div style={{ color: 'var(--green)', fontSize: '13px', fontWeight: '700', textAlign: 'center', marginTop: '5px' }}>
                      ✓ Changes saved successfully!
                    </div>
                  )}

                  {saveError && (
                    <div style={{ color: 'var(--red, #ef4444)', fontSize: '13px', fontWeight: '700', textAlign: 'center', marginTop: '5px' }}>
                      ⚠ {saveError}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-save-profile"
                    disabled={updateCustomerMutation.isPending}
                  >
                    {updateCustomerMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

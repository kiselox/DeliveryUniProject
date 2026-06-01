// src/pages/Customer/CustomerMain.jsx
import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import vendorsServices from '../../services/vendors-services';
import customerServices from '../../services/customer-services';
import Header from '../../components/Header';
import RestaurantCard from '../../components/RestaurantCard';
import SupportChatWidget from '../../components/SupportChatWidget';
import { useOrders } from '../../hooks/useOrders';
import AccountDrawer from './components/AccountDrawer';

export default function CustomerMain() {
  const { id: customerId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerServices.getCustomerById(customerId)
  });

  const { data: vendors = [], isLoading, isError } = useQuery({
    queryKey: ['vendors'],
    queryFn: vendorsServices.getAllVendors
  });

  const { orders = [] } = useOrders();

  // Find active order for support chat reference (most recent one first)
  const activeOrder = [...orders].reverse().find(o => 
    o.customerId === customerId && 
    o.status !== "Delivered" && 
    o.status !== "Cancelled"
  );

  if (isLoading) return <div className="customer-container">Загрузка меню…</div>;
  if (isError) return <div className="customer-container">Ошибка загрузки!</div>;

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.cuisine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="customer-container">
      <Header 
        address={customer?.address} 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onProfileClick={() => setIsAccountOpen(true)}
      />
      
      {filteredVendors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <h3>Ресторанов по запросу «{searchTerm}» не найдено</h3>
          <p>Попробуйте поискать что-то другое, например, «Kebab» или «Sushi»</p>
        </div>
      ) : (
        <div className="restaurants-grid">
          {filteredVendors.map(vendor => (
            <RestaurantCard 
              key={vendor.id} 
              vendor={vendor} 
              customerId={customerId} 
            />
          ))}
        </div>
      )}

      <AccountDrawer 
        isOpen={isAccountOpen} 
        onClose={() => setIsAccountOpen(false)} 
        customerId={customerId} 
      />

      <SupportChatWidget 
        userType="customer"
        userId={customerId}
        userName={customer?.name || "Клиент"}
        activeOrderId={activeOrder?.id}
      />
    </div>
  );
}

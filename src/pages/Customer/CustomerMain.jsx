// src/pages/Customer/CustomerMain.jsx
import React from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import vendorsServices from '../../services/vendors-services';
import customerServices from '../../services/customer-services';
import Header from '../../components/Header';
import RestaurantCard from '../../components/RestaurantCard';
import SupportChatWidget from '../../components/SupportChatWidget';
import { useOrders } from '../../hooks/useOrders';

export default function CustomerMain() {
  const { id: customerId } = useParams();

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerServices.getCustomerById(customerId)
  });

  const { data: vendors = [], isLoading, isError } = useQuery({
    queryKey: ['vendors'],
    queryFn: vendorsServices.getAllVendors
  });

  const { orders = [] } = useOrders();

  // Find active order for support chat reference
  const activeOrder = orders.find(o => 
    o.customerId === customerId && 
    o.status !== "Delivered" && 
    o.status !== "Cancelled"
  );

  if (isLoading) return <div className="customer-container">Загрузка меню...</div>;
  if (isError) return <div className="customer-container">Ошибка загрузки!</div>;

  return (
    <div className="customer-container">
      <Header address={customer?.address} />
      
      <div className="restaurants-grid">
        {vendors.map(vendor => (
          <RestaurantCard 
            key={vendor.id} 
            vendor={vendor} 
            customerId={customerId} 
          />
        ))}
      </div>

      <SupportChatWidget 
        userType="customer"
        userId={customerId}
        userName={customer?.name || "Клиент"}
        activeOrderId={activeOrder?.id}
        activeOrderVendor={activeOrder?.vendorName}
      />
    </div>
  );
}

import React from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import vendorsServices from '../../services/vendors-services';
import customerServices from '../../services/customer-services';
import Header from '../../components/Header';
import RestaurantCard from '../../components/RestaurantCard';

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
    </div>
  );
}

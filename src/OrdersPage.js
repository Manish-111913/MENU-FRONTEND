import React, { useState, useEffect } from 'react';
import './OrdersPage.css';
import './shared.css';
import { Package, Clock, Truck, CheckCircle2 } from 'lucide-react';

const OrdersPage = ({ sessionId, businessId }) => {
  // Timeline steps definition
  const timelineSteps = [
    { 
      id: 'preparing', 
      label: 'Preparing', 
      icon: Clock, 
      time: '10:30 PM'
    },
    { 
      id: 'ready', 
      label: 'Ready', 
      icon: Package, 
      time: '10:45 PM'
    },
    { 
      id: 'on-the-way', 
      label: 'On the way', 
      icon: Truck, 
      time: null
    },
    { 
      id: 'delivered', 
      label: 'Delivered', 
      icon: CheckCircle2, 
      time: null
    }
  ];

  // Mock data to match the images exactly
  const orderData = {
    orderId: '#ORD-2024-001',
    status: 'ready',
    statusText: 'Order ready for pickup',
    estimatedDelivery: '25 minutes',
    orderTime: '10:30 PM',
    items: [
      { name: 'Crispy Calamari', quantity: 2 },
      { name: 'Grilled Salmon', quantity: 1 },
      { name: 'Chocolate Lava Cake', quantity: 1 }
    ],
    total: 44.47
  };

  // Function to determine if a step is completed based on current status
  const isStepCompleted = (stepId) => {
    const currentStepIndex = timelineSteps.findIndex(step => step.id === orderData.status);
    const stepIndex = timelineSteps.findIndex(step => step.id === stepId);
    return stepIndex <= currentStepIndex;
  };

  // Function to determine if connecting line should be golden
  const isLineCompleted = (stepIndex) => {
    const currentStepIndex = timelineSteps.findIndex(step => step.id === orderData.status);
    return stepIndex < currentStepIndex;
  };

  return (
    <div className="order-tracking-container">
      {/* Header */}
      <div className="tracking-header">
        <h1 className="tracking-title">Order Tracking</h1>
        <span className="order-number">{orderData.orderId}</span>
      </div>

      {/* Status Card */}
      <div className="status-card">
        <div className="status-info">
          <div className="status-icon">
            <Package size={24} />
          </div>
          <div className="status-details">
            <h2 className="status-title">{orderData.statusText}</h2>
            <p className="status-subtitle">Estimated delivery: {orderData.estimatedDelivery}</p>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>

      {/* Order Progress */}
      <div className="progress-section">
        <h3 className="section-title">Order Progress</h3>
        <div className="timeline">
          {timelineSteps.map((step, index) => {
            const isCompleted = isStepCompleted(step.id);
            const isCurrentStep = orderData.status === step.id;
            const showLine = index < timelineSteps.length - 1;
            const lineCompleted = isLineCompleted(index);
            
            return (
              <div key={step.id} className={`timeline-item ${isCompleted ? 'completed' : ''} ${isCurrentStep ? 'current' : ''}`}>
                <div className="timeline-icon-wrapper">
                  <div className="timeline-icon">
                    <step.icon size={16} />
                  </div>
                  {showLine && (
                    <div className={`timeline-line ${lineCompleted ? 'completed' : ''}`}></div>
                  )}
                </div>
                <div className="timeline-content">
                  <span className="timeline-label">{step.label}</span>
                  {step.time && <span className="timeline-time">{step.time}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="details-section">
        <h3 className="section-title">Order Details</h3>
        <div className="details-content">
          <div className="detail-row">
            <span className="detail-label">Order Time:</span>
            <span className="detail-value">{orderData.orderTime}</span>
          </div>
          <div className="detail-row items-row">
            <span className="detail-label">Items:</span>
            <div className="items-list">
              {orderData.items.map((item, index) => (
                <div key={index} className="item">
                  {item.name} x{item.quantity}
                </div>
              ))}
            </div>
          </div>
          <div className="detail-row total-row">
            <span className="detail-label">Total:</span>
            <span className="detail-total">${orderData.total}</span>
          </div>
        </div>
      </div>


    </div>
  );
};

export default OrdersPage;

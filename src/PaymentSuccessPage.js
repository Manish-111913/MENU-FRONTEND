import React from 'react';
import { X } from 'lucide-react';
import './PaymentSuccessPage.css';

const PaymentSuccessPage = ({ orderData, onComplete }) => {
  const handleClose = () => {
    onComplete && onComplete(); // Navigate back to orders or menu
  };

  const calculateSubtotal = () => {
    if (!orderData?.items) return 0;
    return orderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const displayItems = orderData?.items || [];

  return (
    <div className="qr-payment-success-container">
      {/* Header with close button and title */}
      <div className="qr-header">
        <div className="success-header">
          <button className="close-success-btn" onClick={handleClose}>
            <X size={24} />
          </button>
          <h1 className="success-title">Bill</h1>
        </div>

      {/* Success Card */}
      <div className="success-card">
        <h2 className="success-card-title">Payment Successful!</h2>
      </div>

      {/* Order Details Section */}
      <div className="order-details-section">
          <h3 className="order-details-title">Order Details</h3>
          
          {/* Date, Time, Order ID */}
          <div className="detail-row">
            <span>Date</span>
            <span>May 15, 2024</span>
          </div>
          <div className="detail-row">
            <span>Time</span>
            <span>12:30 PM</span>
          </div>
          <div className="detail-row">
            <span>Order ID</span>
            <span>1234567890</span>
          </div>
          
          {/* Transaction ID */}
          <div className="detail-row">
            <span>Transaction ID</span>
            <span>TXN9876543210</span>
          </div>
          
          {/* Payment Method */}
          <div className="detail-row">
            <span>Payment Method</span>
            <span>UPI Payment</span>
          </div>

          {/* Items Section */}
          <h3 className="items-title">Items</h3>
          
          {/* Order Items */}
          <div className="order-items-list">
            {displayItems.length === 0 && <div>No items.</div>}
            {displayItems.map((item, index) => (
              <div key={index} className="success-order-item">
                <div className="item-details">
                  <div className="item-name-success">{item.name}</div>
                  <div className="item-quantity-success">{item.quantity} x ₹{item.price.toFixed(2)}</div>
                </div>
                <div className="item-total-success">₹{(item.quantity * item.price).toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="success-summary">
            <div className="success-summary-row">
              <span>Subtotal</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="success-summary-row">
              <span>Tax</span>
              <span>₹{calculateTax().toFixed(2)}</span>
            </div>
            <div className="success-summary-row total">
              <span>Total</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>
          
          {/* Receipt Options Section */}
          <div className="receipt-options-section">
            <h3 className="receipt-title">Receipt Options</h3>
            <div className="receipt-buttons">
              <button className="receipt-btn download-btn">Download PDF</button>
              <button className="receipt-btn email-btn">Email Receipt</button>
            </div>
          </div>
          
          {/* Rating Section */}
          <div className="rating-section">
            <h3 className="rating-title">Rate your experience</h3>
            <div className="stars-container">
              <span className="star filled">★</span>
              <span className="star filled">★</span>
              <span className="star filled">★</span>
              <span className="star filled">★</span>
              <span className="star filled">★</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
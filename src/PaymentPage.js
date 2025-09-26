import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './PaymentPage.css';

const PaymentPage = ({ orderData, onPaymentComplete, onBack, onPaymentSuccess }) => {
  const [currentOrderData, setCurrentOrderData] = useState(null);

  useEffect(() => {
    if (orderData?.items) setCurrentOrderData(orderData);
  }, [orderData]);

  const calculateSubtotal = () => {
    if (!currentOrderData?.items) return 0;
    return currentOrderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePayNow = () => {
    // Handle UPI/Paytm/Google Pay payment
    alert('Processing payment...');
  };

  const handlePayAtCounter = () => {
    // Handle pay at counter
    alert('Order confirmed! Please pay at counter.');
  };

  const handleConfirmPay = () => {
    // Post checkout to backend then navigate to success
    const apiBase = process.env.REACT_APP_API_BASE || '';
    const payload = {
      items: currentOrderData.items.map(i => ({
        menuItemId: i.menuItemId ? Number(i.menuItemId) : undefined,
        name: i.name,
        quantity: i.quantity,
        price: i.price
      }))
    };
    fetch(`${apiBase}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((resp) => { onPaymentSuccess && onPaymentSuccess({ ...currentOrderData, orderId: resp?.orderId, sessionId: resp?.sessionId }); })
      .catch(() => { onPaymentSuccess && onPaymentSuccess(currentOrderData); });
  };

  const handleClose = () => {
    onBack && onBack(); // Go back to cart
  };

  if (!currentOrderData) return <div className="payment-loading">No order items to pay for.</div>;

  return (
    <div className="qr-payment-container">
      {/* Header */}
      <div className="qr-header">
        <div className="payment-header">
          <button className="close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
          <h1 className="payment-title">Payment</h1>
        </div>
      </div>

        {/* Order Summary */}
        <div className="order-summary-section">
          <h2 className="section-title">Order Summary</h2>
          
          <div className="order-items">
            {currentOrderData.items.map((item, index) => (
              <div key={index} className="order-item">
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  <div className="item-quantity">{item.quantity} x ₹{item.price.toFixed(2)}</div>
                </div>
                <div className="item-total">₹{(item.quantity * item.price).toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Summary Section */}
          <div className="summary-section">
            <h3 className="summary-title">Summary</h3>
            <div className="summary-line"></div>
            
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            
            <div className="summary-row">
              <span>Tax</span>
              <span>₹{calculateTax().toFixed(2)}</span>
            </div>
            
            <div className="summary-row total-row">
              <span>Total</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="payment-method-section">
            <h3 className="section-title">Payment Method</h3>
            
            <button className="payment-btn split-bill-btn" onClick={handlePayNow}>
              👥 Split Bill
            </button>
            
            <button className="payment-btn primary-btn" onClick={handlePayNow}>
              Pay Now(UPI,Paytm,Google Pay)
            </button>
            
            <button className="payment-btn secondary-btn" onClick={handlePayAtCounter}>
              Pay at Counter
            </button>
            
            <button className="payment-btn confirm-btn" onClick={handleConfirmPay}>
              Confirm & Pay
            </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
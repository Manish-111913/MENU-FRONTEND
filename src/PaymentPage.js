import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './PaymentPage.css';

const logFlow = (...args) => {
  if (typeof window !== 'undefined' && (process.env.REACT_APP_QR_FLOW_LOG === '1' || !process.env.NODE_ENV || process.env.NODE_ENV === 'development')) {
    console.log('[QR_FLOW][PAYMENT]', ...args);
  }
};

const PaymentPage = ({ orderData, onPaymentComplete, onBack, onPaymentSuccess }) => {
  const [currentOrderData, setCurrentOrderData] = useState(null);

  useEffect(() => {
    if (orderData?.items) {
      setCurrentOrderData(orderData);
      const sp = new URLSearchParams(window.location.search);
      logFlow('mount', {
        items: orderData.items.length,
        subtotal: orderData.items.reduce((t,i)=>t + i.price*i.quantity,0),
        qrId: sp.get('qrId')||sp.get('qrid')||sp.get('qr_id'),
        table: sp.get('table')||sp.get('tableNumber'),
        businessId: sp.get('businessId')||process.env.REACT_APP_BUSINESS_ID,
        apiBase: process.env.REACT_APP_API_BASE || '(relative)'
      });
    }
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
    alert('Processing payment...');
    logFlow('pay-now-click (placeholder-only)');
  };

  const handlePayAtCounter = () => {
    alert('Order confirmed! Please pay at counter.');
    logFlow('pay-at-counter-click');
  };

  const handleConfirmPay = () => {
    const apiBase = process.env.REACT_APP_API_BASE || '';
    const businessId = parseInt(process.env.REACT_APP_BUSINESS_ID || new URLSearchParams(window.location.search).get('businessId') || '1',10);
    const sp = new URLSearchParams(window.location.search);
    const qrId = sp.get('qrId') || sp.get('qrid') || sp.get('qr_id');
    const tableNumber = sp.get('table') || sp.get('tableNumber');
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = subtotal + tax;
    const basePayload = {
      businessId,
      qrId,
      tableNumber,
      total,
      payNow: true,
      items: currentOrderData.items.map(i => ({
        menuItemId: i.menuItemId ? Number(i.menuItemId) : undefined,
        name: i.name,
        quantity: i.quantity,
        price: i.price
      }))
    };

    const attempt = async (variant) => {
      const payload = { ...basePayload };
      if (variant === 'payFirst') { delete payload.payNow; payload.payFirst = true; }
      const url = `${apiBase}/api/checkout`;
      logFlow('checkout-attempt', { variant, url, payloadSummary: { items: payload.items.length, total: payload.total, tableNumber: payload.tableNumber, businessId: payload.businessId, qrId: payload.qrId } });
      const started = Date.now();
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const raw = await r.text();
        let json=null; try { json = raw ? JSON.parse(raw):null; } catch(parseErr) { logFlow('parse-error', { variant, parseErr: parseErr.message, rawSnippet: raw.slice(0,200) }); }
        logFlow('checkout-response', { variant, status: r.status, elapsedMs: Date.now()-started, json, rawSize: raw.length });
        if (!r.ok) {
          return { error: true, status: r.status, json, raw };
        }
        return { error: false, json };
      } catch (networkErr) {
        logFlow('network-error', { variant, message: networkErr.message });
        return { error: true, status: 'network', networkErr: networkErr.message };
      }
    };

    (async () => {
      const first = await attempt('payNow');
      if (first.error) {
        logFlow('first-attempt-failed', { status: first.status, json: first.json, rawSnippet: first.raw ? first.raw.slice(0,300):undefined });
        // Retry with legacy flag if not already tried and server might expect payFirst.
        const second = await attempt('payFirst');
        if (second.error) {
          logFlow('second-attempt-failed', { status: second.status, json: second.json, rawSnippet: second.raw ? second.raw.slice(0,300):undefined });
          onPaymentSuccess && onPaymentSuccess({ ...currentOrderData, paymentStatus: 'unknown', error: true });
          return;
        }
        const resp = second.json || {};
        onPaymentSuccess && onPaymentSuccess({
          ...currentOrderData,
          orderId: resp.orderId,
          sessionId: resp.sessionId,
          qr_id: resp.qrId,
          tableNumber: resp.tableNumber || tableNumber,
          total,
          paymentStatus: resp.paymentStatus || resp.orderPaymentStatus,
          color: resp.color,
          paid: (resp.paymentStatus||resp.orderPaymentStatus)==='paid'
        });
        return;
      }
      const resp = first.json || {};
      onPaymentSuccess && onPaymentSuccess({
        ...currentOrderData,
        orderId: resp.orderId,
        sessionId: resp.sessionId,
        qr_id: resp.qrId,
        tableNumber: resp.tableNumber || tableNumber,
        total,
        paymentStatus: resp.paymentStatus || resp.orderPaymentStatus,
        color: resp.color,
        paid: (resp.paymentStatus||resp.orderPaymentStatus)==='paid'
      });
    })();
  };

  const handleClose = () => {
    onBack && onBack();
    logFlow('close-payment');
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
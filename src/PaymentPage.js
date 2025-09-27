import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { qrLog } from './logger';
import './PaymentPage.css';
import { apiPost } from './apiClient';

const logFlow = (...args) => qrLog('PAYMENT', ...args);

const PaymentPage = ({ orderData, onPaymentComplete, onBack, onPaymentSuccess }) => {
  const [currentOrderData, setCurrentOrderData] = useState(null);
  const [checkoutDebug, setCheckoutDebug] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [inFlight, setInFlight] = useState(false);

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
    } else {
      logFlow('mount-no-items', { hasOrderData: !!orderData });
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
  if (inFlight) { logFlow('confirm-click-ignored-inflight'); return; }
    setCheckoutError(null); setCheckoutDebug(null); setInFlight(true);
    const apiBase = process.env.REACT_APP_API_BASE || '';
    const businessId = parseInt(process.env.REACT_APP_BUSINESS_ID || new URLSearchParams(window.location.search).get('businessId') || '1',10);
    const sp = new URLSearchParams(window.location.search);
  const qrId = sp.get('qrId') || sp.get('qrid') || sp.get('qr_id');
  // Normalize table number from multiple possible params
  let tableNumber = sp.get('table') || sp.get('tableNumber') || sp.get('table_number') || sp.get('tableno');
  if (tableNumber && /^\d+$/.test(tableNumber)) tableNumber = String(parseInt(tableNumber,10));
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

    (async () => {
      const payload = { ...basePayload };
      const url = `${apiBase}/api/orders`;
      logFlow('order-create-attempt', { url, payloadSummary: { items: payload.items.length, total: payload.total, tableNumber: payload.tableNumber, businessId: payload.businessId, qrId: payload.qrId } });
      try {
        const finalPayload = {
          businessId: payload.businessId,
          customerInfo: { name: 'QR Customer', phone: '0000000000' },
          tableNumber: payload.tableNumber,
          paymentInfo: { amount: payload.total, method: 'Online' },
          items: payload.items.map(i => ({ id: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity }))
        };
        logFlow('order-create-payload', finalPayload);
        let apiResp; let json;
        try {
          apiResp = await apiPost('/api/orders', finalPayload);
          json = apiResp.json;
        } catch(err) {
          logFlow('order-create-response', { status: err.status, error: err.message, details: err?.details });
          setCheckoutError({ stage:'order-create-failed', status: err.status, error: err.message, details: err?.details });
          try { window.__lastOrderAttempt = { error: true, err }; } catch(_) {}
          onPaymentSuccess && onPaymentSuccess({ ...currentOrderData, paymentStatus: 'unpaid', error: true });
          setInFlight(false); return;
        }
        logFlow('order-create-response', { status: apiResp.status, elapsedMs: apiResp.elapsedMs, json });
        const succeeded = json?.success || json?.ok;
        if (!succeeded) {
          setCheckoutError({ stage:'order-create-failed', status: apiResp.status, json });
          try { window.__lastOrderAttempt = { success:false, response: json, status: apiResp.status }; } catch(_){ }
          onPaymentSuccess && onPaymentSuccess({ ...currentOrderData, paymentStatus: 'unpaid', error: true });
          setInFlight(false); return;
        }
        const orderId = json.data?.order_id;
        const sessionIdFromResp = json.data?.session_id;
        try { window.__lastOrderAttempt = { success:true, orderId, sessionId: sessionIdFromResp, raw: json }; } catch(_){ }
        // Assume paid if server logic marks payment_status based on method 'Online'
        onPaymentSuccess && onPaymentSuccess({
          ...currentOrderData,
            orderId,
            sessionId: sessionIdFromResp,
            tableNumber: payload.tableNumber,
            total,
            paymentStatus: 'paid',
            paid: true
        });
        logFlow('order-create-success', { orderId, sessionId: sessionIdFromResp });
      } catch (e) {
        logFlow('order-create-network-error', { message: e.message });
        setCheckoutError({ stage:'network', message: e.message });
      } finally { setInFlight(false); }
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
            
            <button className="payment-btn confirm-btn" disabled={inFlight} onClick={handleConfirmPay}>
              {inFlight ? 'Processing...' : 'Confirm & Pay'}
            </button>
            {checkoutError && (
              <div className="checkout-error-box">
                <strong>Checkout Error</strong>
                <pre style={{whiteSpace:'pre-wrap', maxHeight:200, overflow:'auto'}}>{JSON.stringify(checkoutError,null,2)}</pre>
              </div>
            )}
            {checkoutDebug && !checkoutError && (
              <div className="checkout-debug-box">
                <strong>Debug Steps</strong>
                <pre style={{whiteSpace:'pre-wrap', maxHeight:200, overflow:'auto'}}>{JSON.stringify(checkoutDebug,null,2)}</pre>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
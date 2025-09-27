import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './PaymentSuccessPage.css';

const logFlow = (...args) => {
  if (typeof window !== 'undefined' && (process.env.REACT_APP_QR_FLOW_LOG === '1' || !process.env.NODE_ENV || process.env.NODE_ENV === 'development')) {
    console.log('[QR_FLOW][SUCCESS]', ...args);
  }
};

const PaymentSuccessPage = ({ orderData, onComplete }) => {
  const [markStatus, setMarkStatus] = useState('pending'); // pending | success | error

  const apiBase = process.env.REACT_APP_API_BASE || '';
  const searchParams = new URLSearchParams(window.location.search);
  const urlQrId = searchParams.get('qrId') || searchParams.get('qrid') || searchParams.get('qr_id');
  const urlTable = searchParams.get('table') || searchParams.get('tableNumber');
  const urlBiz = searchParams.get('businessId') || searchParams.get('tenant');
  const businessId = parseInt(process.env.REACT_APP_BUSINESS_ID || urlBiz || '1', 10);

  const deriveTableNumber = () => {
    if (!orderData) return null;
    return (
      orderData.tableNumber ||
      orderData.table_number ||
      orderData.table ||
      (orderData.qr && (orderData.qr.table_number || orderData.qr.tableNumber)) ||
      urlTable ||
      null
    );
  };

  // Attempt to mark the session/orders paid as soon as success page mounts.
  useEffect(() => {
    let aborted = false;
    // If already paid via payNow, skip backend call
    if (orderData?.paymentStatus === 'paid' || orderData?.paid) {
      logFlow('skip-mark-paid (already paid)', { sessionId: orderData?.sessionId, orderId: orderData?.orderId });
      setMarkStatus('success');
      return () => { aborted = true; };
    }
    const doMarkPaid = async () => {
      const tableNumber = deriveTableNumber();
      const sessionId = orderData?.sessionId || orderData?.session_id || null;
      const qrId = orderData?.qr_id || orderData?.qrId || urlQrId || null;
      logFlow('attempt-mark-paid', { tableNumber, sessionId, qrId, businessId });
      if (!businessId || (!tableNumber && !qrId && !sessionId)) {
        setMarkStatus('error');
        logFlow('mark-paid-missing-identifiers');
        return;
      }
      try {
        setMarkStatus('pending');
        const totalAmount = (orderData?.total) || null;
        const resp = await fetch(`${apiBase}/api/qr/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId, tableNumber, sessionId, qrId, totalAmount })
        });
        const raw = await resp.text();
        let json = null; try { json = raw?JSON.parse(raw):null; } catch(_e) {}
        logFlow('mark-paid-response', { status: resp.status, json });
        if (!resp.ok) {
          if (json?.error === 'NO_ORDER') {
            logFlow('NO_ORDER-fallback-checkout');
            try {
              const co = await fetch(`${apiBase}/api/checkout`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ businessId, tableNumber, qrId, items: orderData?.items||[], total: totalAmount })});
              const coraw = await co.text();
              let cojson=null; try { cojson = coraw?JSON.parse(coraw):null; } catch(_e) {}
              logFlow('fallback-checkout-response', { status: co.status, cojson });
              if (co.ok) {
                const retry = await fetch(`${apiBase}/api/qr/mark-paid`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ businessId, tableNumber, sessionId: cojson?.sessionId, qrId: cojson?.qrId, totalAmount }) });
                const rraw = await retry.text();
                let rjson=null; try { rjson = rraw?JSON.parse(rraw):null; } catch(_e) {}
                logFlow('retry-mark-paid-response', { status: retry.status, rjson });
                if (retry.ok && rjson?.success) { if (!aborted) setMarkStatus('success'); return; }
              }
            } catch(fbErr) { logFlow('fallback-failed', { message: fbErr.message }); }
          }
          throw new Error('mark-paid failed');
        }
        if (!aborted) setMarkStatus(json?.success ? 'success' : 'error');
      } catch (e) {
        if (!aborted) { setMarkStatus('error'); logFlow('mark-paid-error', { message: e.message }); }
      }
    };
    doMarkPaid();
    return () => { aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    logFlow('close-success');
    onComplete && onComplete();
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
        <div className="mark-paid-status" style={{ fontSize: '0.85rem', marginTop: '4px', color: markStatus==='error' ? '#c0392b' : '#2c3e50' }}>
          {markStatus === 'pending' && 'Finalizing session…'}
          {markStatus === 'success' && 'Table marked paid ✔'}
          {markStatus === 'error' && 'Could not notify backend (will still show).'}
        </div>
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
            <span>{orderData?.orderId || '—'}</span>
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
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
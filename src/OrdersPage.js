import React, { useState, useEffect } from 'react';
import './OrdersPage.css';
import './shared.css';
import { Package, Clock, Truck, CheckCircle2, RefreshCw } from 'lucide-react';
import { qrLog } from './logger';

const OrdersPage = ({ sessionId, businessId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const apiBase = process.env.REACT_APP_API_BASE || '';

  const load = async () => {
    try {
      setRefreshing(true);
      const url = `${apiBase}/api/orders?businessId=${businessId || ''}${sessionId? `&sessionId=${sessionId}`:''}&limit=25`;
      qrLog('ORDERS', 'fetch', url);
      const r = await fetch(url);
      const raw = await r.text();
      let json = null; try { json = raw ? JSON.parse(raw) : null; } catch(parseErr){ qrLog('ORDERS','parse-error',{parseErr:parseErr.message, raw}); }
      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
      setOrders(json.orders || []);
      setError(null);
    } catch(e) {
      setError(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(()=>{ load(); // initial
    const id = setInterval(load, 15000); // auto-refresh every 15s
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, businessId]);
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
  const latest = orders[0];
  const orderData = latest ? {
    orderId: `#ORD-${latest.order_id}`,
    status: (latest.status||'').toLowerCase(),
    statusText: latest.payment_status === 'paid' ? 'Payment Complete' : 'Order Placed',
    estimatedDelivery: latest.estimated_ready_time ? 'Soon' : '—',
    orderTime: latest.placed_at ? new Date(latest.placed_at).toLocaleTimeString() : '—',
    items: [],
    total: 0
  } : null;

  // Function to determine if a step is completed based on current status
  const isStepCompleted = (stepId) => {
    if (!orderData) return false;
    const currentStepIndex = timelineSteps.findIndex(step => step.id === orderData.status) || 0;
    const stepIndex = timelineSteps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return false;
    return stepIndex <= currentStepIndex;
  };

  // Function to determine if connecting line should be golden
  const isLineCompleted = (stepIndex) => {
    if (!orderData) return false;
    const currentStepIndex = timelineSteps.findIndex(step => step.id === orderData.status) || 0;
    return stepIndex < currentStepIndex;
  };

  if (loading) return <div className="order-tracking-container"><h3>Loading orders…</h3></div>;
  if (error) return <div className="order-tracking-container"><h3>Error</h3><p>{error}</p><button onClick={load}>Retry</button></div>;

  const containerColorClass = latest?.color ? `color-${latest.color}` : '';

  return (
    <div className={`order-tracking-container ${containerColorClass}`}>
      <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
        <button className="qr-filter-toggle" onClick={load} disabled={refreshing}>
          <RefreshCw size={14} /> {refreshing? 'Refreshing…':'Refresh'}
        </button>
      </div>
      {/* Header */}
      {orderData ? (
        <div className="tracking-header" style={{borderColor: latest?.color==='green'?'#16a34a': latest?.color==='yellow'?'#fbbf24':'#555'}}>
          <h1 className="tracking-title">Order Tracking</h1>
          <span className="order-number">{orderData.orderId}</span>
          <span className={`status-chip ${latest?.color}`}>{latest?.payment_status}</span>
          {latest?.table_number && <span className="status-chip table">Table {latest.table_number}</span>}
        </div>
      ) : <h2>No orders yet.</h2>}

      {/* Status Card */}
      {orderData && (
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
      )}

      {/* Order Progress */}
      {orderData && (
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
  </div>)}

      {/* Order Details */}
      {orderData && (
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
      )}


    </div>
  );
};

export default OrdersPage;

import React, { useState, useEffect } from 'react';
import './OrdersPage.css';
import './shared.css';
import { Clock, CheckCircle2, Truck, ChefHat, Package, MapPin, Phone, MessageCircle } from 'lucide-react';

// Simplified adaptive version of Orders tracking screen for web.

const statusSteps = [
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: '#fbbf24' },
  { key: 'ready', label: 'Ready', icon: Package, color: '#10b981' },
  { key: 'out-for-delivery', label: 'On the way', icon: Truck, color: '#3b82f6' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: '#22c55e' }
];

export default function OrdersPage({ sessionId, businessId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const apiBase = process.env.REACT_APP_API_BASE || '';

  useEffect(() => {
    let cancelled = false;
    const ctl = new AbortController();

    const mapStatus = (s) => {
      if (!s) return 'preparing';
      const v = String(s).toUpperCase();
      if (v === 'PLACED' || v === 'IN_PROGRESS') return 'preparing';
      if (v === 'READY') return 'ready';
      if (v === 'COMPLETED') return 'delivered';
      return 'preparing';
    };

    const fetchOrders = async () => {
      try {
  const base = apiBase || window.location.origin;
  const root = base.replace(/\/$/, '');
  const url = new URL(`${root}/api/orders`);
        if (businessId) url.searchParams.set('businessId', businessId);
        if (sessionId) url.searchParams.set('sessionId', sessionId);
        const r = await fetch(url.toString(), { signal: ctl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        const latest = (data.orders || [])[0];
        if (latest) {
          setOrder({
            id: latest.order_id,
            items: [],
            total: 0,
            orderTime: latest.placed_at ? new Date(latest.placed_at) : new Date(),
            estimatedDelivery: latest.estimated_ready_time ? new Date(latest.estimated_ready_time) : new Date(Date.now()+25*60*1000),
            currentStatus: mapStatus(latest.status),
            statusHistory: [{ status: mapStatus(latest.status), timestamp: new Date() }],
            deliveryAddress: '',
            contactNumber: ''
          });
          setError(null);
        }
      } catch (e) {
        if (cancelled) return;
        setError(String(e));
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => { cancelled = true; ctl.abort(); clearInterval(interval); };
  }, [apiBase, sessionId, businessId]);

  const progress = (status) => {
    const idx = statusSteps.findIndex(s => s.key === status);
    return (idx+1)/statusSteps.length * 100;
  };

  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
  const etaText = () => { if (!order) return '--'; const diff = order.estimatedDelivery.getTime() - Date.now(); const m = Math.ceil(diff/60000); return m>0? `${m} minutes` : 'Arriving soon'; };

  return (
    <div className="qr-orders">
      <div className="qr-orders-head">
        <h2>Order Tracking</h2>
        <span className="order-id">{order ? `#${order.id}` : ''}</span>
      </div>
      <div className="qr-status-card qr-surface-card">
        <div className="status-row">
          <div className="status-icon" style={{ background: statusSteps.find(s=>s.key===order?.currentStatus)?.color || '#666' }}>
            {React.createElement(statusSteps.find(s=>s.key===order?.currentStatus)?.icon || Clock, { size:24, color:'#fff' })}
          </div>
          <div className="status-text">
            <h4>{order ? order.currentStatus.replace(/-/g,' ') : 'No recent order'}</h4>
            <p>Estimated delivery: {etaText()}</p>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: progress(order?.currentStatus || 'preparing')+'%' }} />
        </div>
      </div>
      <div className="qr-timeline qr-surface-card alt">
        <h3>Order Progress</h3>
        {statusSteps.map((step, idx) => {
          const currentIdx = statusSteps.findIndex(s=>s.key=== (order?.currentStatus || 'preparing'));
            const isCompleted = idx <= currentIdx;
            const history = order?.statusHistory?.find(h=>h.status===step.key);
            return (
              <div key={step.key} className="timeline-item">
                <div className="timeline-icon-wrap">
                  <div className={"timeline-icon" + (isCompleted? ' done':'')} style={isCompleted? { background: step.color, borderColor: step.color } : {}}>
                    {React.createElement(step.icon, { size:16, color: isCompleted ? '#fff' : '#666' })}
                  </div>
                  {idx < statusSteps.length-1 && <div className={"timeline-line" + (isCompleted? ' done':'')}/>}    
                </div>
                <div className="timeline-text">
                  <div className={"label" + (isCompleted? ' done':'')}>{step.label}</div>
                  {history && <div className="time">{formatTime(history.timestamp)}</div>}
                </div>
              </div>
            );
        })}
      </div>

      <div className="qr-order-details qr-surface-card">
        <h3>Order Details</h3>
        <div className="row"><span>Order Time:</span><span>{order ? formatTime(order.orderTime) : '--'}</span></div>
        <div className="row items"><span>Items:</span><div>{order?.items?.map((it,i)=><div key={i}>{it}</div>)}</div></div>
        <div className="row total"><span>Total:</span><span>{order ? `$${order.total?.toFixed(2)}` : '--'}</span></div>
      </div>
      <div className="qr-delivery-info qr-surface-card alt">
        <h3>Delivery Information</h3>
        <div className="info-row"><MapPin size={18} /> <span>{order?.deliveryAddress || ''}</span></div>
        <div className="info-row"><Phone size={18} /> <span>{order?.contactNumber || ''}</span></div>
      </div>

      <div className="qr-action-buttons">
        <button><Phone size={16}/> Call Restaurant</button>
        <button><MessageCircle size={16}/> Live Chat</button>
      </div>
      {error && <div style={{ color:'#f87171', marginTop:12 }}>Orders refresh error: {error}</div>}
    </div>
  );
}

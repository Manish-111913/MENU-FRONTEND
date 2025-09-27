import React, { useState, useEffect } from 'react';
import MenuPage from './MenuPage';
import CartPage from './CartPage';
import OrdersPage from './OrdersPage';
import PaymentPage from './PaymentPage';
import PaymentSuccessPage from './PaymentSuccessPage';
import './qrBilling.css';
import { ShoppingCart, ChefHat, Clock } from 'lucide-react';

// Container that mimics the original tab layout but using web components.
export default function QrBillingApp() {
  const [tab, setTab] = useState('menu');
  const [cart, setCart] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  const handleAdd = (item) => {
    // Default add increments by 1
    updateItemQuantity(item, (getQuantity(item.id) + 1));
  };

  const getQuantity = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const updateItemQuantity = (item, newQty) => {
    setCart(prev => {
      if (newQty <= 0) {
        return prev.filter(i => i.id !== item.id);
      }
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      }
      return [...prev, { id: item.id, menuItemId: item.menuItemId, name: item.name, price: item.price, image: item.image, quantity: newQty, customizations: item.customizations }];
    });
  };

  const cartQuantities = cart.reduce((acc, i) => { acc[i.id] = i.quantity; return acc; }, {});

  const handleConfirmOrder = (data) => {
    // Prepare order data for payment
    const paymentData = {
      items: cart.map(item => ({
        menuItemId: item.menuItemId ? Number(item.menuItemId) : undefined,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };
    setOrderData(paymentData);
    setTab('payment');
  };

  const handlePaymentComplete = () => {
    // Clear cart and order data after successful payment
    setCart([]);
    // Keep sessionId so OrdersPage can query the correct orders
    setOrderData(null);
    setTab('orders');
  };

  const handlePaymentSuccess = (paymentData) => {
    // Navigate to success page with payment data
    setOrderData(paymentData);
    if (paymentData?.sessionId) {
      setSessionId(paymentData.sessionId);
      try { localStorage.setItem('qr.sessionId', String(paymentData.sessionId)); } catch {}
    }
    if (paymentData?.businessId) {
      setBusinessId(paymentData.businessId);
      try { localStorage.setItem('qr.businessId', String(paymentData.businessId)); } catch {}
    }
    setTab('payment-success');
  };

  useEffect(()=>{
    document.body.classList.add('qr-billing-active');
    // Restore persisted session/business for Orders tracking
    try {
      const sid = localStorage.getItem('qr.sessionId');
      if (sid) setSessionId(Number(sid));
      const bid = localStorage.getItem('qr.businessId');
      if (bid) setBusinessId(Number(bid));
    } catch {}
    return () => { document.body.classList.remove('qr-billing-active'); };
  }, []);

  return (
    <div className="qr-billing-theme">
      <div className="qr-shell">
      <div className="qr-tabs-content">
        <div className="qr-content">
          {tab === 'menu' && (
            <MenuPage
              onSelectAdd={handleAdd}
              onQuantityChange={(item, qty)=>updateItemQuantity(item, qty)}
              quantities={cartQuantities}
              onNavigateToCart={()=>setTab('cart')}
            />
          )}
          {tab === 'cart' && <CartPage cart={cart} setCart={setCart} onCheckout={handleConfirmOrder} />}
          {tab === 'payment' && <PaymentPage orderData={orderData} onPaymentComplete={handlePaymentComplete} onBack={() => setTab('cart')} onPaymentSuccess={handlePaymentSuccess} />}
          {tab === 'payment-success' && <PaymentSuccessPage orderData={orderData} onComplete={handlePaymentComplete} />}
          {tab === 'orders' && <OrdersPage sessionId={sessionId} businessId={businessId} />}
        </div>
      </div>
      <div className={`qr-tabbar-outer ${tab === 'payment' || tab === 'payment-success' ? 'hidden' : ''}`}>
        <div className="qr-tabbar-inner">
          <div className="qr-tabbar">
            <button onClick={()=>setTab('menu')} className={tab==='menu'? 'active':''}><ChefHat size={18}/> <span>Menu</span></button>
            <button onClick={()=>setTab('cart')} className={tab==='cart'? 'active':''}><ShoppingCart size={18}/> <span>Cart{cart.length? ` (${cart.reduce((s,i)=>s+i.quantity,0)})`:''}</span></button>
            <button onClick={()=>setTab('orders')} className={tab==='orders'? 'active':''}><Clock size={18}/> <span>Orders</span></button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import './CartPage.css';
import './shared.css';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

// Lightweight logger (disabled in production build unless explicitly enabled)
const logFlow = (...args) => {
  if (typeof window !== 'undefined' && (process.env.REACT_APP_QR_FLOW_LOG === '1' || !process.env.NODE_ENV || process.env.NODE_ENV === 'development')) {
    console.log('[QR_FLOW][CART]', ...args);
  }
};

export default function CartPage({ cart = [], setCart, onCheckout }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const totalItems = useMemo(()=> cart.reduce((s,i)=>s+i.quantity,0), [cart]);
  const subtotal = useMemo(()=> cart.reduce((s,i)=>s + i.price * i.quantity,0), [cart]);
  const tax = subtotal * 0.08;
  const delivery = cart.length ? 3.99 : 0;
  const grandTotal = subtotal + tax + delivery;

  const updateQty = (id, change) => {
    setCart(prev => {
      const next = prev
        .map(it => it.id === id ? { ...it, quantity: Math.max(0, it.quantity + change) } : it)
        .filter(it => it.quantity > 0);
      logFlow('qty-change', { id, change, resultingQty: next.find(i=>i.id===id)?.quantity, totalItems: next.reduce((s,i)=>s+i.quantity,0) });
      return next;
    });
  };
  const removeItem = (id) => setCart(prev => { const next = prev.filter(i=>i.id!==id); logFlow('remove-item', { id, remaining: next.length }); return next; });

  if (!cart.length) return (
    <div className="qr-cart-empty">
      <ShoppingCart size={80} color="#666" />
      <h3>Your cart is empty</h3>
      <p>Add some delicious items to get started!</p>
    </div>
  );

  return (
    <div className="qr-cart">
      <div className="qr-cart-head">
        <h2>Your Cart</h2>
        <span className="items">{totalItems} items</span>
      </div>
      <div className="qr-cart-list">
        {cart.map(item => (
          <div key={item.id} className="qr-cart-item">
            <img src={item.image} alt={item.name} />
            <div className="info">
              <h4>{item.name}</h4>
              {item.customizations?.length && <p className="customs">{item.customizations.join(', ')}</p>}
              <div className="price">${item.price}</div>
            </div>
            <div className="qty">
              <button onClick={()=>updateQty(item.id,-1)}><Minus size={14}/></button>
              <span>{item.quantity}</span>
              <button onClick={()=>updateQty(item.id,1)}><Plus size={14}/></button>
            </div>
            <button className="remove" onClick={()=>removeItem(item.id)}><Trash2 size={18} color="#ff4444" /></button>
          </div>
        ))}
      </div>
      <div className="qr-summary">
        <div className="row"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="row"><span>Tax (8%):</span><span>${tax.toFixed(2)}</span></div>
        <div className="row"><span>Delivery:</span><span>${delivery.toFixed(2)}</span></div>
        <div className="row total"><span>Total:</span><span>${grandTotal.toFixed(2)}</span></div>
      </div>
      <button className="checkout-btn" onClick={()=> { logFlow('checkout-click', { items: cart.length, total: grandTotal }); setShowConfirm(true); }}>Proceed to Checkout</button>

      {showConfirm && (
        <div className="qr-modal-backdrop center" onClick={()=>{ logFlow('dismiss-confirm'); setShowConfirm(false); }}>
          <div className="qr-modal small" onClick={e=>e.stopPropagation()}>
            <h3>Confirm Your Order</h3>
            <p>Total: ${grandTotal.toFixed(2)}</p>
            <p>Items: {totalItems}</p>
            <p>Estimated delivery: 30-45 minutes</p>
            <div className="qr-actions">
              <button onClick={()=>{ logFlow('cancel-confirm'); setShowConfirm(false);} } className="secondary">Cancel</button>
              <button onClick={()=>{ 
                logFlow('confirm-order', { items: cart.length, total: grandTotal });
                onCheckout && onCheckout({ cart, total: grandTotal });
                setShowConfirm(false); 
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

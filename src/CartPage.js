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

  // Track in-progress text edits for quantity inputs so user can clear to blank without item removal
  const [editingQty, setEditingQty] = useState({}); // { id: 'string' }

  const totalItems = useMemo(()=> cart.reduce((s,i)=>s+i.quantity,0), [cart]);
  const subtotal = useMemo(()=> cart.reduce((s,i)=>s + i.price * i.quantity,0), [cart]);
  // Simple illustrative tax & delivery (adjust or remove for production pricing rules)
  const tax = subtotal * 0.08;
  const delivery = cart.length ? 30 : 0; // use whole-number INR style
  const grandTotal = subtotal + tax + delivery;

  // Removed confirmation modal; checkout now proceeds immediately.

  const commitQty = (id, newQty) => {
    setCart(prev => prev
      .map(it => it.id === id ? { ...it, quantity: newQty } : it)
      .filter(it => it.quantity > 0)
    );
  };

  const updateQty = (id, change) => {
    // Commit any pending edit first
    if (editingQty[id] !== undefined) {
      let base = 0;
      const txt = editingQty[id];
      if (txt && /^\d+$/.test(txt)) base = parseInt(txt, 10);
      commitQty(id, base);
      setEditingQty(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
    setCart(prev => prev
      .map(it => {
        if (it.id === id) {
          const nextQ = Math.max(0, it.quantity + change);
          return { ...it, quantity: nextQ };
        }
        return it;
      })
      .filter(it => it.quantity > 0)
    );
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
              {item.customizations?.length ? <p className="customs">{item.customizations.join(', ')}</p> : null}
              <div className="price">₹{item.price}</div>
            </div>
            <div className="qty">
              <button onClick={()=>updateQty(item.id,-1)}><Minus size={14}/></button>
              <input
                type="number"
                className="qty-input"
                min={0}
                step={1}
                value={editingQty[item.id] !== undefined ? editingQty[item.id] : String(item.quantity)}
                onFocus={()=>{
                  if (editingQty[item.id] === undefined) {
                    setEditingQty(prev => ({ ...prev, [item.id]: item.quantity === 0 ? '' : String(item.quantity) }));
                  }
                }}
                onChange={(e)=>{
                  const raw = e.target.value;
                  if (/^\d{0,4}$/.test(raw)) {
                    setEditingQty(prev => ({ ...prev, [item.id]: raw }));
                  }
                }}
                onKeyDown={(e)=>{ if (e.key === 'Enter') e.currentTarget.blur(); }}
                onBlur={()=>{
                  const txt = editingQty[item.id];
                  if (txt !== undefined) {
                    let num = txt === '' ? 0 : parseInt(txt, 10);
                    if (isNaN(num)) num = 0;
                    num = Math.max(0, Math.min(9999, num));
                    if (num !== item.quantity) commitQty(item.id, num);
                    setEditingQty(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                  }
                }}
              />
              <button onClick={()=>updateQty(item.id,1)}><Plus size={14}/></button>
            </div>
            <button className="remove" onClick={()=>removeItem(item.id)}><Trash2 size={18} color="#ff4444" /></button>
          </div>
        ))}
        {/* Spacer so last items not hidden behind fixed footer */}
        <div style={{ height: '210px' }} />
      </div>

      <div className="qr-cart-fixed-footer">
        <div className="qr-summary">
          <div className="row"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="row"><span>Tax (8%):</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="row"><span>Delivery:</span><span>₹{delivery.toFixed(2)}</span></div>
          <div className="row total"><span>Total:</span><span>₹{grandTotal.toFixed(2)}</span></div>
        </div>
        <button
          className="checkout-btn"
          onClick={()=> {
            logFlow('checkout-click-immediate', { items: cart.length, total: grandTotal });
            onCheckout && onCheckout({ cart, total: grandTotal });
          }}
        >Proceed to Checkout</button>
      </div>
    </div>
  );
}

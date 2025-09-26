import React, { useState, useMemo } from 'react';
import './CartPage.css';
import './shared.css';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

export default function CartPage({ cart = [], setCart, onCheckout }) {

  // Track in-progress text edits for quantity inputs so user can clear to blank without item removal
  const [editingQty, setEditingQty] = useState({}); // { id: 'string' }

  const totalItems = useMemo(()=> cart.reduce((s,i)=>s+i.quantity,0), [cart]);
  const subtotal = useMemo(()=> cart.reduce((s,i)=>s + i.price * i.quantity,0), [cart]);
  const tax = subtotal * 0.08;
  const delivery = cart.length ? 3.99 : 0;
  const grandTotal = subtotal + tax + delivery;

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
  const removeItem = (id) => setCart(prev => prev.filter(i=>i.id!==id));

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
                onFocus={(e)=>{
                  // Enter edit mode; if quantity is 0 show blank else show number
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
                onKeyDown={(e)=>{
                  if (e.key === 'Enter') { e.currentTarget.blur(); }
                }}
                onBlur={()=>{
                  const txt = editingQty[item.id];
                  if (txt !== undefined) {
                    let num = txt === '' ? 0 : parseInt(txt, 10);
                    if (isNaN(num)) num = 0;
                    num = Math.max(0, Math.min(9999, num));
                    if (num !== item.quantity) {
                      commitQty(item.id, num);
                    }
                    setEditingQty(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                  }
                }}
              />
              <button onClick={()=>updateQty(item.id,1)}><Plus size={14}/></button>
            </div>
            <button className="remove" onClick={()=>removeItem(item.id)}><Trash2 size={18} color="#ff4444" /></button>
          </div>
        ))}
      </div>
      {/* Spacer to prevent list bottom getting hidden behind fixed summary */}
      <div style={{ height: '220px' }} />

      <div className="cart-sticky-summary">
        <div className="qr-summary">
          <div className="row"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="row"><span>Tax (8%):</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="row"><span>Delivery:</span><span>₹{delivery.toFixed(2)}</span></div>
          <div className="row total"><span>Total:</span><span>₹{grandTotal.toFixed(2)}</span></div>
        </div>
        <button className="checkout-btn" onClick={()=> {
          onCheckout && onCheckout({ cart, total: grandTotal });
        }}>Proceed to Checkout</button>
      </div>
    </div>
  );
}

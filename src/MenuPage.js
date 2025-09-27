import React, { useState, useMemo } from 'react';
import placeholderImg from './placeholder-menu-item.png';
import './MenuPage.css';
import './shared.css';
import { Search, Filter, Clock, Star, Plus, Minus, X, TrendingUp, Heart, Tag, IndianRupee, Timer } from 'lucide-react';

// All menu data now comes from the backend API (no static items).
const filterDefs = [
  { id: 'trending', name: 'Trending', icon: TrendingUp },
  { id: 'offers', name: 'Offers', icon: Tag },
  { id: 'price', name: 'Price', icon: IndianRupee },
  { id: 'time', name: 'Prep Time', icon: Timer },
];

export default function MenuPage({ onSelectAdd, onQuantityChange, quantities = {}, onNavigateToCart }) {
  const PLACEHOLDER_IMG = 'https://via.placeholder.com/400x300?text=Image';
  // Fallback description templates (longer descriptions to ensure 2+ lines)
  const DESC_TEMPLATES = [
    'Chef-crafted and packed with flavor, this signature dish combines fresh ingredients with bold seasonings and traditional cooking techniques to create an unforgettable dining experience.',
    'A customer favorite that delivers comfort in every bite, featuring premium ingredients carefully prepared to perfection with our house-made sauces and aromatic spices.',
    'Fresh ingredients and bold taste come together in this quick-to-enjoy dish, expertly seasoned and cooked to order using time-honored recipes passed down through generations.',
    'Light yet satisfying, this made-to-order creation showcases the finest seasonal ingredients, skillfully balanced with complementary flavors and textures for maximum enjoyment.',
    'Rich taste meets perfect seasoning in this beautifully balanced dish, prepared with attention to detail and served with our signature accompaniments for the ultimate culinary experience.',
    'Crisp, vibrant, and absolutely addictive, this crowd-pleaser features carefully selected ingredients that burst with flavor in every single bite, leaving you craving for more.',
  ];
  const pickDesc = (name, id) => {
    // Deterministic hash so description stays stable between renders
    const key = (String(name) + id).split('').reduce((h,ch)=> (h*31 + ch.charCodeAt(0)) >>> 0, 0);
    return DESC_TEMPLATES[key % DESC_TEMPLATES.length];
  };
  // Standard customizations that every menu item will have
  const STANDARD_CUSTOMIZATIONS = ['Spicy', 'Extra crispy', 'No sauce'];
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState(null);
  React.useEffect(() => {
    // Use relative path by default so CRA dev proxy can route to backend.
    // Optionally override with REACT_APP_API_BASE for deployed environments.
    const apiBase = process.env.REACT_APP_API_BASE || '';

    const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), ms);
      return fetch(url, { ...opts, signal: ctl.signal })
        .finally(() => clearTimeout(t));
    };

  // Generate varied prep times based on item name for filter testing
  const getPrepTime = (itemName, itemId) => {
    const name = itemName.toLowerCase();
    // Different prep times based on food type
    if (name.includes('biryani') || name.includes('rice')) return 25;
    if (name.includes('pizza') || name.includes('naan')) return 20;
    if (name.includes('burger') || name.includes('sandwich')) return 15;
    if (name.includes('pasta') || name.includes('noodles')) return 18;
    if (name.includes('curry') || name.includes('masala')) return 22;
    if (name.includes('tikka') || name.includes('kebab')) return 12;
    if (name.includes('salad') || name.includes('juice')) return 5;
    if (name.includes('soup') || name.includes('dal')) return 15;
    if (name.includes('chicken') || name.includes('mutton')) return 20;
    if (name.includes('fish') || name.includes('prawn')) return 18;
    if (name.includes('dessert') || name.includes('ice cream')) return 8;
    if (name.includes('tea') || name.includes('coffee') || name.includes('chai')) return 3;
    
    // Fallback: use item ID to create variety (5-25 minutes range)
    const hash = String(itemId).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash % 21) + 5; // 5-25 minutes
  };

  // Assign offers to specific items for testing
  const getHasOffer = (itemName, itemId) => {
    const name = itemName.toLowerCase();
    // Add offers to specific food types
    if (name.includes('pizza') || name.includes('burger')) return true;
    if (name.includes('biryani') || name.includes('salmon')) return true;
    if (name.includes('tikka')) return true; // This will catch both paneer tikka and chicken tikka
    if (name.includes('special') || name.includes('royal')) return true;
    
    // Random offers for some items based on ID
    const hash = String(itemId).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash % 4) === 0; // ~25% of items get offers
  };

    const mapItems = (data) => (data?.items || []).map(it => ({
      id: String(it.id),
      menuItemId: Number(it.id),
      name: it.name,
      description: (it.description && it.description.trim()) || pickDesc(it.name, it.id),
      price: Number(it.price),
      image: it.image,
      category: it.category || 'All',
      prepTime: getPrepTime(it.name, it.id), // Always use our function for varied times
      isAvailable: it.isAvailable !== false,
      isTrending: !!it.isTrending,
      isLiked: !!it.isLiked,
      hasOffer: getHasOffer(it.name, it.id), // Always use our function to ensure offers show
      rating: it.rating || 4.5,
      customizations: STANDARD_CUSTOMIZATIONS // Every item gets the same 3 customizations
    }));

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const r = await fetchWithTimeout(`${apiBase}/api/menu`, {}, 8000);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          if (cancelled) return;
          setItems(mapItems(data));
          setError(null);
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
          // brief backoff
          await new Promise(res => setTimeout(res, 400 * attempt));
        }
      }
      if (!cancelled) {
        setError(lastErr ? String(lastErr) : 'Failed to load');
        setLoading(false);
      }
    };

    load();

    // Removed periodic refresh to avoid disrupting the UI
    return () => { cancelled = true; };
  }, []);
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('All');
  const [filters, setFilters] = useState([]);
  const [localQuantities, setLocalQuantities] = useState(quantities);
  // Sync when parent changes (e.g., cart modifications from CartPage)
  React.useEffect(()=>{ setLocalQuantities(quantities); }, [quantities]);
  const [modalItem, setModalItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState({});
  // Temporary text while user is editing a quantity so they can clear the leading 0
  const [editingQty, setEditingQty] = useState({}); // { [id]: string }

  // Handle customization changes
  const handleCustomizationChange = (customization) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [customization]: !prev[customization]
    }));
  };

  // Reset customizations when modal opens
  React.useEffect(() => {
    if (modalItem) {
      setSelectedCustomizations({});
    }
  }, [modalItem]);

  // Suggestion pairs for complementary items
  const SUGGESTIONS = {
    'salmon': ['white rice', 'steamed vegetables', 'lemon butter sauce'],
    'chicken': ['garlic bread', 'caesar salad', 'mashed potatoes'],
    'pasta': ['garlic bread', 'parmesan cheese', 'side salad'],
    'steak': ['mashed potatoes', 'grilled asparagus', 'red wine sauce'],
    'pizza': ['garlic knots', 'caesar salad', 'soda'],
    'burger': ['french fries', 'onion rings', 'milkshake'],
    'salad': ['grilled chicken', 'croutons', 'dressing'],
    'soup': ['bread roll', 'crackers', 'side salad'],
    'calamari': ['marinara sauce', 'lemon wedges', 'side salad'],
    'rice': ['grilled protein', 'vegetables', 'soy sauce']
  };

  const getSuggestion = (itemName) => {
    const name = itemName.toLowerCase();
    for (const [key, suggestions] of Object.entries(SUGGESTIONS)) {
      if (name.includes(key)) {
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        return `Try ${randomSuggestion} with ${itemName}!`;
      }
    }
    return `Try a refreshing drink with ${itemName}!`;
  };

  const toggleFilter = (id) => {
    setFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const updateQty = (id, change) => {
    // If there is a pending edit string, commit it first so +/- is relative to committed number
    if (editingQty[id] !== undefined) {
      const txt = editingQty[id];
      let base = localQuantities[id] || 0;
      if (txt !== '') {
        const parsed = parseInt(txt, 10);
        if (!isNaN(parsed)) base = parsed;
      } else {
        base = 0;
      }
      // replace quantity with committed base before applying change
      setLocalQuantities(prev => ({ ...prev, [id]: base }));
      setEditingQty(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
    setLocalQuantities(prev => {
      const currentQty = prev[id] || 0;
      const newQty = Math.max(0, currentQty + change);
      const next = { ...prev, [id]: newQty };
      const item = items.find(i=>i.id===id);
      
      // Show suggestion when adding item to cart (every time + is clicked)
      if (item && change > 0) {
        const suggestionText = getSuggestion(item.name);
        setSuggestion(suggestionText);
        setTimeout(() => setSuggestion(null), 4000);
      }
      
      if (item && onQuantityChange) onQuantityChange(item, newQty);
      return next;
    });
  };

  // Set absolute quantity (no diff math) to avoid accidental double increments when committing edits
  const setQty = (id, absolute) => {
    setLocalQuantities(prev => {
      const current = prev[id] || 0;
      if (current === absolute) return prev; // no change
      const next = { ...prev, [id]: absolute };
      const item = items.find(i=>i.id===id);
      if (item && onQuantityChange) onQuantityChange(item, absolute);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (category !== 'All' && item.category !== category) return false;
      if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filters.includes('offers') && !item.hasOffer) return false;
      return true;
    }).sort((a,b) => {
      if (filters.includes('trending')) return b.rating - a.rating; // Sort by highest rating first
      if (filters.includes('price')) return a.price - b.price;
      if (filters.includes('time')) return a.prepTime - b.prepTime;
      return 0;
    });
  }, [items, searchText, category, filters]);

  // Calculate cart totals
  const cartTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = localQuantities[item.id] || 0;
      return total + (item.price * quantity);
    }, 0);
  }, [items, localQuantities]);

  const cartItemCount = useMemo(() => {
    return Object.values(localQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [localQuantities]);

  // Track order summary height so we can pad the grid and keep last row controls visible
  const [orderSummaryHeight, setOrderSummaryHeight] = useState(0);
  const orderSummaryRef = React.useCallback(node => {
    if (!node) return; // unmount
    // Measure immediately after mount
    const measure = () => {
      try {
        const rect = node.getBoundingClientRect();
        if (rect?.height && Math.abs(rect.height - orderSummaryHeight) > 2) {
          setOrderSummaryHeight(rect.height);
        }
      } catch (e) { /* ignore */ }
    };
    measure();
    // Also observe for size changes (e.g., responsive text wrapping)
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [orderSummaryHeight]);

  const handleOpen = (item) => {
    if (!item.isAvailable) { alert('Item unavailable today.'); return; }
    setModalItem(item);
    setSelectedCustomizations({}); // Reset customizations when opening modal
    if (item.recommendations?.length) {
      setRecommendation(item.recommendations.join(' & '));
      setTimeout(() => setRecommendation(null), 3000);
    }
  };

  const toggleCustomization = (customization) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [customization]: !prev[customization]
    }));
  };

  return (
    <div
      className={"qr-menu-container" + (cartItemCount > 0 && !modalItem ? ' showing-summary' : '')}
      style={cartItemCount > 0 && !modalItem ? { '--qr-order-summary-height': `${orderSummaryHeight || 0}px` } : undefined}
    >
      {suggestion && (
        <div className="qr-suggestion-banner">
          {suggestion}
        </div>
      )}
      <div className="qr-header"><h2>QR Billing Menu</h2></div>
      <div className="qr-search-bar">
        <Search size={18} />
        <input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Search for food" />
        <button className="qr-filter-toggle" onClick={()=>setShowFilters(s=>!s)}>
          <Filter size={18} color="#fbbf24" />
        </button>
      </div>

      {showFilters && (
        <div className="qr-filters">
          {filterDefs.map(f => {
            const Icon = f.icon; const active = filters.includes(f.id);
            return (
              <button key={f.id} onClick={()=>toggleFilter(f.id)} className={"qr-filter-chip" + (active? ' active':'')}>
                <Icon size={14} /> {f.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="qr-categories">
        {["All", ...Array.from(new Set(items.map(i => i.category))).filter(Boolean)].map(c => (
          <button key={c} onClick={()=>setCategory(c)} className={"qr-cat" + (category===c? ' active':'')}>{c}</button>
        ))}
      </div>

      {loading && (
        <div className="qr-cart-empty">
          <h3>Loading menu…</h3>
        </div>
      )}
      {error && !loading && (
        <div className="qr-cart-empty">
          <h3>Failed to load menu</h3>
          <p>{error}</p>
          <button className="qr-filter-toggle" onClick={async ()=>{
            try {
              setDiagRunning(true); setDiagResults(null);
              const apiBase = process.env.REACT_APP_API_BASE || '';
              const [dbRes, imgRes] = await Promise.all([
                fetch(`${apiBase}/api/smoke/db`).then(r=>r.json()).catch(e=>({ ok:false, error:String(e) })),
                fetch(`${apiBase}/api/smoke/images`).then(r=>r.json()).catch(e=>({ ok:false, error:String(e) }))
              ]);
              setDiagResults({ db: dbRes, images: imgRes });
            } finally { setDiagRunning(false); }
          }}>Run diagnostics</button>
          {diagRunning && <p>Running diagnostics…</p>}
          {diagResults && (
            <div style={{ marginTop: 12, textAlign:'left' }}>
              <div><strong>DB:</strong> {diagResults.db?.ok ? 'OK' : 'FAIL'} {diagResults.db?.count ? `(rows: ${diagResults.db.count})` : ''} {diagResults.db?.error ? `- ${diagResults.db.error}` : ''}</div>
              <div><strong>Images:</strong> {diagResults.images?.ok ? 'OK' : 'ISSUES'} {typeof diagResults.images?.total === 'number' ? `(checked: ${diagResults.images.total})` : ''} {diagResults.images?.failures?.length ? `- failures: ${diagResults.images.failures.length}` : ''}</div>
            </div>
          )}
        </div>
      )}

      <div className="qr-grid">
        {filtered.map(item => (
          <div key={item.id} className={"qr-item" + (!item.isAvailable? ' unavailable':'')} onClick={() => handleOpen(item)}>
            <div className="qr-img-wrap">
              <img src={item.image || placeholderImg} alt={item.name} onError={e=>{ if(e.target.dataset.fallback!=='1'){ e.target.dataset.fallback='1'; e.target.src=placeholderImg; }}} />
              <div className="qr-badge time"><Clock size={10} /> {item.prepTime}m</div>
              {item.hasOffer && <div className="qr-badge offer">Offer</div>}
              {!item.isAvailable && <div className="qr-overlay">Empty</div>}
            </div>
            <div className="qr-info">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <div className="qr-footer-line">
                <span className="price">₹{item.price}</span>
                <span className="rating"><Star size={12} fill="#fbbf24" color="#fbbf24" /> {item.rating}</span>
              </div>
              <div className="qr-qty">
                <button onClick={(e)=>{e.stopPropagation(); item.isAvailable && updateQty(item.id,-1);}} disabled={!item.isAvailable}><Minus size={14}/></button>
                <input
                  type="number"
                  className="qty-input"
                  min={0}
                  step={1}
                  value={editingQty[item.id] !== undefined ? editingQty[item.id] : String(localQuantities[item.id] || 0)}
                  onClick={(e)=>e.stopPropagation()}
                  onFocus={(e)=>{
                    e.stopPropagation();
                    // Enter edit mode; if current is 0, start with empty so user can type fresh number
                    if (editingQty[item.id] === undefined) {
                      setEditingQty(prev => ({ ...prev, [item.id]: (localQuantities[item.id] || 0) === 0 ? '' : String(localQuantities[item.id] || 0) }));
                    }
                  }}
                  onChange={(e)=>{
                    e.stopPropagation();
                    if(!item.isAvailable) return;
                    const raw = e.target.value;
                    // Allow only up to 4 digits, or empty string while editing
                    if (/^\d{0,4}$/.test(raw)) {
                      setEditingQty(prev => ({ ...prev, [item.id]: raw }));
                    }
                  }}
                  onKeyDown={(e)=>{
                    if(e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  onBlur={(e)=>{
                    // Commit edit with absolute value
                    const txt = editingQty[item.id];
                    if (txt !== undefined) {
                      let num = txt === '' ? 0 : parseInt(txt, 10);
                      if (isNaN(num)) num = 0;
                      num = Math.max(0, Math.min(9999, num));
                      setQty(item.id, num);
                      setEditingQty(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                    }
                  }}
                />
                <button onClick={(e)=>{e.stopPropagation(); item.isAvailable && updateQty(item.id,1);}} disabled={!item.isAvailable}><Plus size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalItem && (
        <div className="modal-overlay" onClick={()=>setModalItem(null)}>
          <div className="menu-item-modal" onClick={e=>e.stopPropagation()}>
            {/* Close Button - Top Right Corner */}
            <button className="close-btn-top-right" onClick={()=>setModalItem(null)}>
              <span className="close-icon">×</span>
            </button>
            
            {/* Item Header with Name */}
            <div className="item-header">
              <h2 className="item-name">{modalItem.name}</h2>
            </div>
            <img src={modalItem.image || placeholderImg} onError={e=>{ if(e.target.dataset.fallback!=='1'){ e.target.dataset.fallback='1'; e.target.src=placeholderImg; }}} alt={modalItem.name} className="qr-modal-img" />
            <p className="qr-modal-desc centered">{modalItem.description}</p>
            <h5>Customizations:</h5>
            <ul className="qr-customizations selectable">
              {modalItem.customizations?.map((c,i)=>(
                <li key={i}>
                  <label className="qr-customization-option">
                    <input
                      type="checkbox"
                      checked={!!selectedCustomizations[c]}
                      onChange={()=>handleCustomizationChange(c)}
                    />
                    <span>{c}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="qr-modal-footer">
              <div className="modal-price">₹{modalItem.price}</div>
              <button className="add-btn" onClick={()=>{ 
                const selected = Object.entries(selectedCustomizations).filter(([,v])=>v).map(([k])=>k);
                const enriched = { ...modalItem, customizations: selected.length? selected : modalItem.customizations };
                updateQty(modalItem.id,1); 
                onSelectAdd && onSelectAdd(enriched); 
                setModalItem(null); 
              }}> <Plus size={16}/> Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {recommendation && (
        <div className="qr-recommend">
          Perfect Combo! Try {recommendation} with this item!
        </div>
      )}

      {/* Order Summary - Fixed at bottom - Only show when no modal is open */}
      {cartItemCount > 0 && !modalItem && (
        <div className="qr-order-summary" ref={orderSummaryRef}>
          <div className="qr-bill-summary">
            <span className="qr-summary-label">Bill Summary</span>
            <span className="qr-summary-total">₹{cartTotal.toFixed(2)}</span>
          </div>
          <button className="qr-add-to-cart-btn" onClick={() => {
            // Navigate to cart page
            onNavigateToCart && onNavigateToCart();
          }}>
            View Cart
          </button>
        </div>
      )}
    </div>
  );
}

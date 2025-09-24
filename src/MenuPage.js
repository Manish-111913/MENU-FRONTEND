import React, { useState, useMemo } from 'react';
import './MenuPage.css';
import './shared.css';
import { Search, Filter, Clock, Star, Plus, Minus, X, TrendingUp, Heart, Tag, DollarSign, Timer } from 'lucide-react';

// All menu data now comes from the backend API (no static items).
const filterDefs = [
  { id: 'trending', name: 'Trending', icon: TrendingUp },
  { id: 'liked', name: 'Most Liked', icon: Heart },
  { id: 'offers', name: 'Offers', icon: Tag },
  { id: 'price', name: 'Price', icon: DollarSign },
  { id: 'time', name: 'Prep Time', icon: Timer },
];

export default function MenuPage({ onSelectAdd, onQuantityChange, quantities = {} }) {
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

    const mapItems = (data) => (data?.items || []).map(it => ({
      id: String(it.id),
      menuItemId: Number(it.id),
      name: it.name,
      description: it.description || '',
      price: Number(it.price),
      image: it.image,
      category: it.category || 'All',
      prepTime: it.prepTime || 10,
      isAvailable: it.isAvailable !== false,
      isTrending: !!it.isTrending,
      isLiked: !!it.isLiked,
      hasOffer: !!it.hasOffer,
      rating: it.rating || 4.5,
      customizations: it.customizations || []
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

  const toggleFilter = (id) => {
    setFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const updateQty = (id, change) => {
    setLocalQuantities(prev => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + change) };
      const item = items.find(i=>i.id===id);
      if (item && onQuantityChange) onQuantityChange(item, next[id]);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (category !== 'All' && item.category !== category) return false;
      if (searchText && !item.name.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filters.includes('trending') && !item.isTrending) return false;
      if (filters.includes('liked') && !item.isLiked) return false;
      if (filters.includes('offers') && !item.hasOffer) return false;
      return true;
    }).sort((a,b) => {
      if (filters.includes('price')) return a.price - b.price;
      if (filters.includes('time')) return a.prepTime - b.prepTime;
      return 0;
    });
  }, [items, searchText, category, filters]);

  const handleOpen = (item) => {
    if (!item.isAvailable) { alert('Item unavailable today.'); return; }
    setModalItem(item);
    if (item.recommendations?.length) {
      setRecommendation(item.recommendations.join(' & '));
      setTimeout(() => setRecommendation(null), 3000);
    }
  };

  return (
    <div className="qr-menu-container">
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
              <img src={item.image || 'https://via.placeholder.com/400x300?text=Menu+Item'} alt={item.name} />
              <div className="qr-badge time"><Clock size={10} /> {item.prepTime}m</div>
              {item.hasOffer && <div className="qr-badge offer">Offer</div>}
              {!item.isAvailable && <div className="qr-overlay">Empty</div>}
            </div>
            <div className="qr-info">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <div className="qr-footer-line">
                <span className="price">${item.price}</span>
                <span className="rating"><Star size={12} fill="#fbbf24" color="#fbbf24" /> {item.rating}</span>
              </div>
              <div className="qr-qty">
                <button onClick={(e)=>{e.stopPropagation(); item.isAvailable && updateQty(item.id,-1);}} disabled={!item.isAvailable}><Minus size={14}/></button>
                <span>{localQuantities[item.id]||0}</span>
                <button onClick={(e)=>{e.stopPropagation(); item.isAvailable && updateQty(item.id,1);}} disabled={!item.isAvailable}><Plus size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalItem && (
        <div className="qr-modal-backdrop" onClick={()=>setModalItem(null)}>
          <div className="qr-modal" onClick={e=>e.stopPropagation()}>
            <div className="qr-modal-head">
              <h3>{modalItem.name}</h3>
              <button onClick={()=>setModalItem(null)}><X size={20} /></button>
            </div>
            <img src={modalItem.image || 'https://via.placeholder.com/400x300?text=Menu+Item'} alt={modalItem.name} className="qr-modal-img" />
            <p>{modalItem.description}</p>
            <h5>Customizations</h5>
            <ul className="qr-customizations">
              {modalItem.customizations?.map((c,i)=>(<li key={i}>{c}</li>))}
            </ul>
            <div className="qr-modal-footer">
              <div className="modal-price">${modalItem.price}</div>
              <button className="add-btn" onClick={()=>{ updateQty(modalItem.id,1); onSelectAdd && onSelectAdd(modalItem); setModalItem(null); }}> <Plus size={16}/> Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {recommendation && (
        <div className="qr-recommend">
          Perfect Combo! Try {recommendation} with this item!
        </div>
      )}
    </div>
  );
}

// Shared logging utility for QR billing front-end
// Activates if:
//  - REACT_APP_QR_FLOW_LOG === '1'
//  - window.localStorage.QR_FLOW_LOG === '1'
//  - URL has ?debug=1 or &qrlog=1
//  - NODE_ENV is development
export function qrLog(scope, ...args) {
  try {
    if (typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    const enabled = (
      process.env.REACT_APP_QR_FLOW_LOG === '1' ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('QR_FLOW_LOG') === '1') ||
      qs.get('debug') === '1' || qs.get('qrlog') === '1' ||
      !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
    );
    if (!enabled) return;
    const ts = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.log(`[QR_FLOW][${scope}] ${ts}`, ...args);
  } catch (_) {}
}

export function enableQrLogs() {
  try { if (typeof window !== 'undefined') localStorage.setItem('QR_FLOW_LOG','1'); } catch(_){}
}

export function disableQrLogs() {
  try { if (typeof window !== 'undefined') localStorage.removeItem('QR_FLOW_LOG'); } catch(_){}
}
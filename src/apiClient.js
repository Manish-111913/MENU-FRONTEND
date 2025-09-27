// Central API client with rich console logging for all network calls.
// Uses qrLog gating rules (debug query param, env flag, localStorage flag, dev mode).
// Provides: apiRequest(method, path, { body, headers, query })
// Automatically:
//  - Resolves base URL from REACT_APP_API_BASE or relative
//  - Times request duration
//  - Logs start & end events with a short request id
//  - Safely parses JSON (non-fatal if invalid JSON)
//  - Stores a rolling buffer of the last 50 API events on window.__API_LOG_BUFFER
//  - Summarizes large payloads to avoid console noise

import { qrLog } from './logger';

function getApiBase() {
  return process.env.REACT_APP_API_BASE || '';
}

function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

function summarize(value, maxLen = 300) {
  try {
    if (value == null) return value;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (str.length <= maxLen) return JSON.parse(str);
    return { _truncated: true, preview: str.slice(0, maxLen) + '…', length: str.length };
  } catch (_) {
    return { _unserializable: true };
  }
}

function pushBuffer(entry) {
  try {
    if (typeof window === 'undefined') return;
    if (!window.__API_LOG_BUFFER) window.__API_LOG_BUFFER = [];
    window.__API_LOG_BUFFER.push(entry);
    if (window.__API_LOG_BUFFER.length > 50) window.__API_LOG_BUFFER.shift();
  } catch(_){}
}

export async function apiRequest(method, path, { body, headers = {}, query } = {}) {
  const id = shortId();
  let url = path.startsWith('http') ? path : getApiBase() + path;

  if (query && typeof query === 'object') {
    const sp = new URLSearchParams();
    Object.entries(query).forEach(([k,v]) => { if (v !== undefined && v !== null) sp.append(k, v); });
    const qs = sp.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const startTs = Date.now();
  const startLog = { phase: 'start', id, method, url, body: summarize(body) };
  qrLog('API', startLog);
  pushBuffer(startLog);

  const init = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);

  let status; let text; let json; let error; let ok = false;
  try {
    const resp = await fetch(url, init);
    status = resp.status;
    text = await resp.text();
    try { json = text ? JSON.parse(text) : null; } catch(parseErr) {
      // Non-JSON response is fine; record snippet
    }
    ok = resp.ok;
    if (!resp.ok) {
      error = { type: 'http', status, snippet: text ? text.slice(0,200) : null };
    }
  } catch (e) {
    error = { type: 'network', message: e.message };
  }

  const elapsedMs = Date.now() - startTs;
  const endLog = {
    phase: 'end', id, method, url, status, elapsedMs,
    success: ok && !error,
    json: json && summarize(json),
    error
  };
  qrLog('API', endLog);
  pushBuffer(endLog);

  if (error) {
    const err = new Error(`API ${method} ${url} failed`);
    err.status = status;
    err.details = { text, json };
    throw err;
  }

  return { status, json, text, elapsedMs };
}

// Convenience helpers
export const apiGet = (path, opts) => apiRequest('GET', path, opts);
export const apiPost = (path, body, opts={}) => apiRequest('POST', path, { ...opts, body });
export const apiPatch = (path, body, opts={}) => apiRequest('PATCH', path, { ...opts, body });
export const apiDelete = (path, opts) => apiRequest('DELETE', path, opts);

// Quick inspector in console: window.__dumpApiLogs()
if (typeof window !== 'undefined' && !window.__dumpApiLogs) {
  window.__dumpApiLogs = function() {
    try { return window.__API_LOG_BUFFER || []; } catch(_){ return []; }
  };
}

// src/api/client.js
export const API_KEY = import.meta.env.VITE_API_SECRET || '';

console.log('API_KEY loaded:', API_KEY ? 'YES (length: ' + API_KEY.length + ')' : 'NO');

/**
 * Wrapper kolem fetch — automaticky přidá X-API-Key header ke všem API voláním.
 */
export function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(API_KEY ? {'X-API-Key': API_KEY} : {}),
  };
  return fetch(url, { ...options, headers });
}
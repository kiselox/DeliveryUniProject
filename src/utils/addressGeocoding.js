// src/utils/addressGeocoding.js

/**
 * Helper to geocode Poznań address keywords automatically.
 * Falls back to CDV Dormitory if no matches are found.
 * @param {string} addressText 
 * @returns {{lat: number, lng: number}}
 */
export function geocodePoznanAddress(addressText) {
  const text = (addressText || '').toLowerCase();
  
  if (text.includes('jeżyce') || text.includes('jezyce')) {
    return { lat: 52.4064, lng: 16.9015 };
  }
  if (text.includes('malta')) {
    return { lat: 52.4018, lng: 16.9605 };
  }
  if (text.includes('garbary')) {
    return { lat: 52.4132, lng: 16.9405 };
  }
  if (text.includes('półwiejska') || text.includes('polwiejska')) {
    return { lat: 52.4016, lng: 16.9275 };
  }
  if (text.includes('centrum') || text.includes('stare miasto')) {
    return { lat: 52.4069, lng: 16.9299 };
  }
  
  // Default to CDV Dormitory
  return { lat: 52.4140, lng: 16.9295 };
}

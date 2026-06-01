// src/utils/imageFallbacks.js

/**
 * Converts a clean SVG markup string into a cross-browser compatible base64 data URL.
 * This guarantees it loads instantly and runs entirely offline without network requests.
 * @param {string} svgString - The raw SVG string.
 * @returns {string} Safe Base64 Data URL.
 */
function svgToDataUrl(svgString) {
  try {
    const base64 = btoa(unescape(encodeURIComponent(svgString.trim())));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (err) {
    console.error('Error generating SVG data URL fallback:', err);
    // Simple fallback data URL
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%238b5cf6"/></svg>';
  }
}

// 1. Cozy restaurant brand logo (circular dome icon with modern violet gradient)
const RESTAURANT_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a78bfa" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#logoGrad)" />
  <circle cx="50" cy="50" r="32" fill="rgba(255, 255, 255, 0.15)" />
  <path d="M32 55 c0-15 12-25 18-25 s18 10 18 25 Z" fill="#ffffff" />
  <rect x="28" y="56" width="44" height="4" rx="2" fill="#ffffff" />
  <circle cx="50" cy="27" r="4.5" fill="#ffffff" />
</svg>
`;

// 2. Cozy restaurant building/bistro facade (premium illustration with purple brand theme)
const RESTAURANT_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180">
  <defs>
    <linearGradient id="restGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c4b5fd" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
  </defs>
  <rect width="300" height="180" fill="url(#restGrad)" />
  <circle cx="40" cy="30" r="1.5" fill="white" opacity="0.6"/>
  <circle cx="80" cy="50" r="1" fill="white" opacity="0.4"/>
  <circle cx="220" cy="25" r="2" fill="white" opacity="0.7"/>
  <circle cx="260" cy="60" r="1.5" fill="white" opacity="0.5"/>
  <path d="M50 180 L50 110 L120 70 L190 110 L190 180 Z" fill="#2e1065" opacity="0.85" />
  <polygon points="45,110 120,65 195,110" fill="#4c1d95" />
  <rect x="105" y="130" width="30" height="50" rx="3" fill="#fbbf24" />
  <circle cx="112" cy="155" r="2" fill="#78350f" />
  <rect x="70" y="125" width="20" height="25" rx="2" fill="#fef08a" />
  <rect x="150" y="125" width="20" height="25" rx="2" fill="#fef08a" />
  <path d="M50 110 L190 110 L180 118 L170 110 L160 118 L150 110 L140 118 L130 110 L120 118 L110 110 L100 118 L90 110 L80 118 L70 110 L60 118 Z" fill="#ec4899" />
</svg>
`;

// 3. Elegant menu item plate/steaming dish (modern cutlery, dome outline, clean violet styling)
const MENU_ITEM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <defs>
    <linearGradient id="foodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5f3ff" />
      <stop offset="100%" stop-color="#ddd6fe" />
    </linearGradient>
    <linearGradient id="plateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
  </defs>
  <rect width="300" height="200" fill="url(#foodGrad)" />
  <ellipse cx="150" cy="115" rx="75" ry="35" fill="rgba(139, 92, 246, 0.15)" />
  <ellipse cx="150" cy="110" rx="70" ry="30" fill="url(#plateGrad)" stroke="#cbd5e1" stroke-width="1.5" />
  <ellipse cx="150" cy="110" rx="52" ry="22" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
  <path d="M125 98 C135 75, 130 65, 140 50" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" opacity="0.6" />
  <path d="M150 98 C160 70, 155 60, 165 45" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
  <path d="M175 98 C182 78, 178 68, 185 53" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" opacity="0.6" />
  <path d="M115 105 c0-16 20-25 35-25 s35 9 35 25 Z" fill="#8b5cf6" />
  <rect x="110" y="105" width="80" height="6" rx="3" fill="#7c3aed" />
  <circle cx="150" cy="76" r="4" fill="#7c3aed" />
  <path d="M60 70 L60 110 M55 70 L65 70 M55 70 L55 85 M65 70 L65 85" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
  <path d="M240 70 L240 110 M236 70 L240 60 L240 70 Z" fill="#94a3b8" stroke="#94a3b8" stroke-width="2" stroke-linejoin="round" />
</svg>
`;

// 4. Abstract brand banner/hero image with glowing meshes & brand typography
const HERO_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300">
  <defs>
    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#2e1065" />
    </linearGradient>
    <pattern id="foodPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <path d="M20 20 h10 v10 h-10 z" fill="rgba(255,255,255,0.03)" />
      <circle cx="60" cy="40" r="8" fill="rgba(255,255,255,0.02)" />
      <path d="M30 70 L40 80 L50 70" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="2" />
    </pattern>
  </defs>
  <rect width="1200" height="300" fill="url(#heroGrad)" />
  <rect width="1200" height="300" fill="url(#foodPattern)" />
  <circle cx="200" cy="150" r="180" fill="#8b5cf6" filter="blur(80px)" opacity="0.3" />
  <circle cx="1000" cy="150" r="220" fill="#ec4899" filter="blur(100px)" opacity="0.2" />
  <text x="600" y="140" font-family="'Inter', system-ui, sans-serif" font-size="48" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4" opacity="0.9">
    POLONEZ DELIVERY
  </text>
  <text x="600" y="185" font-family="'Inter', system-ui, sans-serif" font-size="18" font-weight="500" fill="#c4b5fd" text-anchor="middle" letter-spacing="8" opacity="0.8">
    DELICIOUS MOMENTS DELIVERED INSTANTLY
  </text>
  <path d="M150 120 L190 100 L170 150 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linejoin="round" />
  <circle cx="170" cy="120" r="3" fill="rgba(255,255,255,0.3)" />
  <rect x="980" y="110" width="40" height="20" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
  <line x1="975" y1="125" x2="1025" y2="125" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
</svg>
`;

export const FALLBACK_RESTAURANT_LOGO = svgToDataUrl(RESTAURANT_LOGO_SVG);
export const FALLBACK_RESTAURANT_IMAGE = svgToDataUrl(RESTAURANT_IMAGE_SVG);
export const FALLBACK_MENU_ITEM = svgToDataUrl(MENU_ITEM_SVG);
export const FALLBACK_HERO_IMAGE = svgToDataUrl(HERO_IMAGE_SVG);

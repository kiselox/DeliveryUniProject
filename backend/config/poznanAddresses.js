// backend/config/poznanAddresses.js

// Poznań coordinates for restaurants (Vendors)
export const VENDOR_COORDINATES = {
  v1: { name: 'KFC', lat: 52.4018, lng: 16.9205 },        // Galeria Malta / Center
  v2: { name: "McDonald's", lat: 52.4023, lng: 16.9261 }, // Półwiejska
  v3: { name: 'Burger King', lat: 52.4029, lng: 16.9125 },// Poznań Główny
  v4: { name: 'Pasibus', lat: 52.4048, lng: 16.9255 },    // Półwiejska
  v5: { name: "Misha's Pizza", lat: 52.4115, lng: 16.9068 }, // Jeżyce
  v6: { name: 'Pierogarnia Poznańska', lat: 52.4250, lng: 16.9180 }, // Sołacz / Winogrady
  v7: { name: 'Poznań Kebab', lat: 52.3920, lng: 16.9220 },          // Wilda
  v8: { name: 'Hana Sushi', lat: 52.4080, lng: 16.9580 }             // Malta (East) / Śródka
};

// Built-in dictionary of street names in Poznań for quick geocoding (normalized keys)
export const POZNAN_ADDRESSES = {
  "polwiejska": { lat: 52.4023, lng: 16.9261 },
  "garbary": { lat: 52.4045, lng: 16.9372 },
  "jezyce": { lat: 52.4115, lng: 16.9068 },
  "malta": { lat: 52.4018, lng: 16.9205 },
  "cdv": { lat: 52.4140, lng: 16.9295 },
  "dormitory": { lat: 52.4140, lng: 16.9295 },
  "roosevelta": { lat: 52.4081, lng: 16.9118 },
  "glogowska": { lat: 52.3855, lng: 16.8942 },
  "kopernika": { lat: 52.4005, lng: 16.9299 },
  "rynek": { lat: 52.4082, lng: 16.9348 }
};

// Poznań coordinates for customers
export const CUSTOMER_COORDINATES = {
  c1: { name: 'Денис', lat: 52.4140, lng: 16.9295 } // Dormitory CDV
};

// Courier starting coordinates
export const COURIER_COORDINATES = {
  cour1: { lat: 52.4140, lng: 16.9295 }, // Starts at CDV Dormitory
  cour2: { lat: 52.4081, lng: 16.9118 }, // Starts at Roosevelta
  cour3: { lat: 52.4045, lng: 16.9372 }  // Starts at Garbary
};

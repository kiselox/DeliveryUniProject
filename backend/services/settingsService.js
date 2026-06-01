import { settings, usePostgres, saveLocalDb } from '../db.js';

export const getSettings = () => {
  return settings;
};

export const updateSettings = ({ pricePerKm, scooterPricePerKm, carPricePerKm, globalSurcharge }) => {
  if (pricePerKm !== undefined) settings.pricePerKm = parseFloat(pricePerKm);
  if (scooterPricePerKm !== undefined) settings.scooterPricePerKm = parseFloat(scooterPricePerKm);
  if (carPricePerKm !== undefined) settings.carPricePerKm = parseFloat(carPricePerKm);
  if (globalSurcharge !== undefined) settings.globalSurcharge = parseFloat(globalSurcharge);
  
  if (!usePostgres) {
    saveLocalDb();
  }
  
  console.log(`⚙️ Support updated settings: Velo ${settings.pricePerKm} PLN/km, Scooter ${settings.scooterPricePerKm} PLN/km, Car ${settings.carPricePerKm} PLN/km, +${settings.globalSurcharge} PLN Surcharge.`);
  return settings;
};

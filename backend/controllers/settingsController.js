import * as settingsService from '../services/settingsService.js';

export const getSettings = (req, res, next) => {
  try {
    const currentSettings = settingsService.getSettings();
    res.json(currentSettings);
  } catch (err) {
    next(err);
  }
};

export const updateSettings = (req, res, next) => {
  try {
    const updatedSettings = settingsService.updateSettings(req.body);
    res.json(updatedSettings);
  } catch (err) {
    next(err);
  }
};

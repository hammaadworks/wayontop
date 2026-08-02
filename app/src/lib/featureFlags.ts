export const FEATURE_FLAGS = {
  // Enables switching venues for testing purposes
  // Activated in DEV mode or if a specific localStorage key is set.
  enableVenueSwitcher: import.meta.env.DEV || localStorage.getItem('FF_VENUE_SWITCHER') === 'true',
};

export const CONSUMER_MAP_ZOOM_TIERS = {
    VENUE_PIN_MAX: 14.5,
    ROUTES_MIN: 14.5,
    
    // PINS
    MAJOR_PINS_MIN: 15.0,
    ALL_PINS_MIN: 15.5,

    // NAMES
    MAJOR_NAMES_MIN: 16.0,
    ALL_NAMES_MIN: 17.0,
};

export const LALBAGH_GEOFENCE_RADIUS_METERS = 1500;

export const PRODUCER_MAP_ZOOM_TIERS = {
    ...CONSUMER_MAP_ZOOM_TIERS,
    // Show sponsors much earlier in the editor so producers can see them
    SPONSOR_ZONES_AND_RADIUS_MIN: 16.0,
    SPONSOR_LOGOS_MIN: 16.0
};

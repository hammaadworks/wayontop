// Configuration for progressive display of map elements based on zoom level
export const MAP_ZOOM_TIERS = {
    VENUE_PIN_MAX: 14.5,
    ROUTES_MIN: 14.5,
    
    // PINS
    MAJOR_PINS_MIN: 15.0, // gate, poi, facility
    ALL_PINS_MIN: 15.5,   // track, stamp, default

    // NAMES
    MAJOR_NAMES_MIN: 16.0, // gate, poi, facility
    ALL_NAMES_MIN: 17.0,   // track, stamp, default

    // SPONSORS
    SPONSOR_ZONES_AND_RADIUS_MIN: 18.5,
    SPONSOR_LOGOS_MIN: 17.5
};

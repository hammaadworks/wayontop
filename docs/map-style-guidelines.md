# wayon.top Map Style Guidelines

This document outlines the standard architecture and best practices for configuring MapLibre GL JS maps across all wayon.top properties (both Consumer applications and Producer internal tools). 

By adhering to these conventions, we ensure our maps are highly performant, easily debuggable, and aesthetically consistent (premium, polished, and tailored to make our UI elements pop).

---

## 1. The Root Style Object

We always use Mapbox Style Specification **v8**. Every map style object must include basic metadata for debugging and future-proofing.

```javascript
{
  version: 8,
  name: "Lalbagh Satellite", // Always provide a human-readable name
  metadata: {
    app: "wayon.top Consumer",
    theme: "satellite"
  },
  sources: { ... },
  layers: [ ... ]
}
```

**Why?** 
When we scale to multiple venues (malls, parks, indoor arenas), having metadata embedded in the map style ensures the renderer and our analytics always know exactly what base map is currently active.

---

## 2. Source Configurations (The Data)

Sources define *where* the data comes from.

### Best Practices:
1. **Separation of Concerns:** Keep your sources distinctly separated from layers. You can define multiple sources (satellite, vector-streets, user-geojson) even if they aren't all visible at once.
2. **Explicit Max Zoom:** For raster imagery, **always define `maxzoom` on the source, not the layer.** 
   - *Example:* OpenStreetMap standard tiles generally max out at zoom 18. Set `maxzoom: 18` on the source. MapLibre will then automatically overzoom (scale) the level 18 tiles when the user zooms into level 20+. If you don't do this, the map will attempt to fetch level 20 tiles and render a white/blank screen when it receives a 404.

```javascript
sources: {
  'satellite': {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256, // explicitly set for Esri
    attribution: '&copy; Esri',
    maxzoom: 19,
    scheme: "xyz"
  },
  'osm': {
    type: 'raster',
    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '&copy; OpenStreetMap Contributors',
    maxzoom: 18, // OSM caps out at 18
    scheme: "xyz"
  }
}
```

---

## 3. Layer Configurations (The Presentation)

Layers define *how* the data is drawn.

### Best Practices:
1. **Standardized Naming:** Always use descriptive IDs (e.g., `satellite-base`, `osm-base`, `road-labels`).
2. **Layout Controls:** Always include `layout: { visibility: "visible" }` as a baseline. This allows us to programmatically hide/show layers without deleting them from the map instance.
3. **Color Grading (Paint Properties):** Raw raster maps often clash with UI elements. We apply subtle image filters via the `paint` property to push the map into the background and allow our UI (paths, POI pins, sponsor cards) to be the hero.

#### The "Premium Satellite" Grade
Lush greens, high contrast, lifted shadows.
```javascript
paint: {
  "raster-opacity": 1,
  "raster-contrast": 0.15,
  "raster-saturation": 0.2,
  "raster-brightness-min": 0.05, // Lifts harsh black shadows
  "raster-fade-duration": 300    // Smooth fade-in for tiles
}
```

#### The "Subdued Standard" Grade (OSM)
OpenStreetMap is naturally very loud and colorful. We desaturate it to prevent it from competing with our brightly colored UI markers.
```javascript
paint: {
  "raster-opacity": 1,
  "raster-saturation": -0.2, // Calms down the loud colors
  "raster-contrast": 0.05,
  "raster-fade-duration": 300
}
```

---

## 4. Future Architecture (Vector Migration)

While V1 of Lalbagh relies heavily on raster (Satellite/OSM image tiles) for speed of deployment, V2 for complex venues will transition to **Vector Tiles**. 

When we migrate, we will split the map into granular layers instead of a single flat image:

```text
Sources
├── satellite
├── vector-streets
└── user-geojson

Layers
├── satellite-base       (bottom)
├── terrain              (middle)
├── roads                (middle)
├── road-labels          (top)
└── custom-markers       (top-most)
```

By adhering to this strict Source -> Layer separation now, our codebase will easily support this migration.

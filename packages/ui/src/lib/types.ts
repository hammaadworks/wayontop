export type NodeBaseType = 
    | 'poi'           
    | 'gate'          
    | 'utility_major' 
    | 'utility_minor' 
    | 'stamp'         
    | 'intersection'; 

export type LocalizedText = Record<'en' | 'kn' | 'hi', string>;
export type LocalizedList = Record<'en' | 'kn' | 'hi', string[]>;

export interface MapEvent {
    id: number;
    name: string;
    badge_name?: string;
    description?: string;
    start_date: string; // ISO string
    end_date: string;   // ISO string
    is_active: boolean; 
}

export interface NodeCategory {
    id: number;
    code: string;                 
    base_type: NodeBaseType;      
    icon_key: string;             
    color_theme: string;          
    name: LocalizedText;  
    synonyms: LocalizedList;      
    description?: LocalizedText;  // Fallback description for generic nodes
    image_url?: string;           // Fallback image for the category before relying on icon_key
}

export interface GraphNode {
    id: number;
    category_id: number;          
    lat: number;
    lng: number;
    
    name?: LocalizedText;         
    description?: LocalizedText;  
    synonyms?: LocalizedList;     
    
    // UI/UX feature: if image_url exists, MapLibre uses it as a circular thumbnail avatar instead of the category icon_key
    image_url?: string;           
    
    status: 'active' | 'construction';
    is_paid: boolean;             
    snapEdgeId?: string;          
    
    event_id?: number;            
    category?: NodeCategory;      // Populated by Supabase join
    venue_key?: string;           // Added for venue scope

    // Newly added fields for Wizard
    has_stamp?: boolean;
    active_from?: string;
    active_to?: string;
    extra_info?: LocalizedText | any;
    tags?: string[];
}

export interface GraphEdge {
    id?: string;
    from: number;
    to: number;
    distance_m: number;
    geometry?: [number, number][]; // GPS polyline for curved paths
    is_hidden?: boolean;           // Used for staff-only routing or shortcuts
    venue_key?: string;
}

// Sponsor & Ad Interfaces remain untouched
export interface Sponsor {
    id: string;
    name: string;
    logo_asset?: string;
    creative_asset?: string;
    tagline?: string;
    cta_link?: string;
    is_default_ad?: boolean;
    zone_ids?: string[];
}

export interface SponsorZone {
    id: string;
    name: string;
    poi_id?: number; // legacy
    poi_ids: number[];
    radius_m: number;
}

export interface DefaultAd {
    id: string;
    name: string;
    creative_asset?: string;
    tagline?: string;
    logo_asset?: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    categories: NodeCategory[];
    events: MapEvent[];
    sponsorZones: SponsorZone[];
    sponsors: Sponsor[];
    defaultAds?: DefaultAd[];
    rawTraces?: { lat: number; lng: number }[][];
}

// Gamification specific data for a stamp node
export interface Stamp {
    id: number;
    name: string;
    lat: number;
    lng: number;
    rarity: 'common' | 'rare' | 'epic';
    description?: string;
    poi_link: string | null;
    image_url?: string;
}

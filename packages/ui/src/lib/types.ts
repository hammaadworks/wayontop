export type NodeType = 'gate' | 'poi' | 'track' | 'stamp' | 'facility';

/**
 * Pre-defined tags that have special UI treatment or standard meaning.
 * Mappers should prefer using these tags before creating custom ones.
 */
export const SYSTEM_TAGS = [
    'garbage',
    'paid',
    'toilet',
    'drinking_water',
    'wheelchair_accessible',
    'food_stall',
    'canteen',
] as const;

export type SystemTag = typeof SYSTEM_TAGS[number];

export const TAG_SYNONYMS: Record<string, string[]> = {
    'garbage': ['trash', 'bin', 'dustbin', 'waste'],
    'restroom': ['toilet', 'washroom', 'bathroom', 'loo'],
    'food_stall': ['snack', 'eat', 'hungry', 'food', 'juice'],
    'water': ['drink', 'thirsty']
};

export const GARBAGE_KEYWORDS = ['garbage', ...(TAG_SYNONYMS['garbage'] || [])];
export const GARBAGE_REGEX = new RegExp(GARBAGE_KEYWORDS.join('|'), 'i');

export function isGarbageNode(node: { name?: string, tags?: string[] }): boolean {
    const hasTag = node.tags?.some(t => GARBAGE_KEYWORDS.includes(t.toLowerCase()));
    const hasNameMatch = node.name ? GARBAGE_REGEX.test(node.name) : false;
    return (hasTag || hasNameMatch);
}

export interface GraphNode {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: NodeType;
    tags: string[]; // Ideally SystemTag, but open to custom strings
    has_stamp?: boolean; // For POIs that also act as stamps
    active_from?: string; // ISO date string (YYYY-MM-DD) for seasonal nodes
    active_to?: string;   // ISO date string (YYYY-MM-DD) for seasonal nodes
    
    // POI Content Metadata
    image_url?: string;
    extra_info?: string;
}

export interface GraphEdge {
    from: string;
    to: string;
    distance_m: number;
    is_hidden?: boolean; // If true, used for routing but not visually drawn as a path line
}

export interface Sponsor {
    id: string;
    name: string;
    logo_asset?: string;
    creative_asset?: string;
    tagline?: string;
    cta_link?: string;
    is_default_ad?: boolean;
}

export interface SponsorZone {
    id: string;
    name: string;
    poi_id?: string; // legacy
    poi_ids: string[];
    radius_m: number;
    sponsor_id?: string; // legacy
    sponsor_ids?: string[];
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
    sponsorZones: SponsorZone[];
    sponsors: Sponsor[];
    defaultAds?: DefaultAd[];
    rawTraces?: { lat: number; lng: number }[][];
    goldenStampName?: string;
}

export interface Stamp {
    id: string;
    name: string;
    lat: number;
    lng: number;
    rarity: 'common' | 'rare' | 'epic' | 'golden';
    description?: string;
    poi_link: string | null;
    image_url?: string;
}

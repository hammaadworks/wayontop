export type NodeType = 'gate' | 'poi' | 'track' | 'stamp' | 'facility';

export interface GraphNode {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: NodeType;
    tags: string[];
    has_stamp?: boolean; // For POIs that also act as stamps
}

export interface GraphEdge {
    from: string;
    to: string;
    distance_m: number;
}

export interface SponsorZone {
    id: string;
    name: string;
    poi_id: string;
    radius_m: number;
    creative_asset?: string;
    tagline?: string;
    logo_asset?: string;
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
    sponsors: SponsorZone[];
    defaultAds?: DefaultAd[];
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

export type NodeType = 'gate' | 'poi' | 'track' | 'stamp' | 'facility';

export interface GraphNode {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: NodeType;
    tags: string[];
    has_stamp?: boolean; // For POIs that also act as stamps
    subtype?: string; // For facilities (e.g., 'washroom', 'first_aid')
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
    banner_asset: string;
    video_asset: string;
    tagline?: string;
    logo_asset?: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    sponsors: SponsorZone[];
}

export interface Stamp {
    id: string;
    name: string;
    lat: number;
    lng: number;
    rarity: 'common' | 'rare' | 'epic' | 'golden';
    description?: string;
    poi_link: string | null;
}

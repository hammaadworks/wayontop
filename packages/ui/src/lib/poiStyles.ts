import type {LucideIcon} from 'lucide-react';
import {Circle, Coffee, DoorClosed, Droplets, Gem, HeartHandshake, MapPin, Trash2} from 'lucide-react';
import type {GraphNode} from './types';
import {isGarbageNode} from './types';

export interface POIStyle {
    icon: LucideIcon;
    iconColor: string;
    glowColor: string;
    ringColor: string;
    activeGlow: string;
    bgClass: string; // for list views
    textClass: string; // for list views
}

export function getPOIStyle(node: Pick<GraphNode, 'type' | 'tags' | 'name'>): POIStyle {
    const tags = node.tags || [];

    // Base default style
    let icon: LucideIcon = MapPin;
    let iconColor = 'text-slate-400';
    let glowColor = 'bg-slate-500/20';
    let ringColor = 'border-slate-500/30';
    let activeGlow = 'shadow-[0_0_20px_rgba(148,163,184,0.6)]';
    let bgClass = 'bg-slate-500/10';
    let textClass = 'text-slate-400';

    // 1. Dynamic Tags Override
    if (isGarbageNode({tags, name: node.name})) {
        return {
            icon: Trash2,
            iconColor: 'text-rose-400',
            glowColor: 'bg-rose-500/20',
            ringColor: 'border-rose-500/30',
            activeGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.6)]',
            bgClass: 'bg-rose-500/10',
            textClass: 'text-rose-400',
        };
    }
    if (tags.includes('food_stall') || tags.includes('canteen')) {
        return {
            icon: Coffee,
            iconColor: 'text-orange-400',
            glowColor: 'bg-orange-500/20',
            ringColor: 'border-orange-500/30',
            activeGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.6)]',
            bgClass: 'bg-orange-500/10',
            textClass: 'text-orange-400',
        };
    }
    if (tags.includes('restroom') || tags.includes('water') || tags.includes('toilet') || tags.includes('drinking_water')) {
        return {
            icon: Droplets,
            iconColor: 'text-cyan-400',
            glowColor: 'bg-cyan-500/20',
            ringColor: 'border-cyan-500/30',
            activeGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.6)]',
            bgClass: 'bg-cyan-500/10',
            textClass: 'text-cyan-400',
        };
    }


    // 2. Base Type Fallbacks
    if (node.type === 'stamp') {
        icon = Gem;
        iconColor = 'text-fuchsia-400';
        glowColor = 'bg-fuchsia-500/20';
        ringColor = 'border-fuchsia-500/30';
        activeGlow = 'shadow-[0_0_20px_rgba(232,121,249,0.6)]';
        bgClass = 'bg-fuchsia-500/10';
        textClass = 'text-fuchsia-400';
    } else if (node.type === 'gate') {
        icon = DoorClosed;
        iconColor = 'text-emerald-400';
        glowColor = 'bg-emerald-500/20';
        ringColor = 'border-emerald-500/30';
        activeGlow = 'shadow-[0_0_20px_rgba(16,185,129,0.6)]';
        bgClass = 'bg-emerald-500/10';
        textClass = 'text-emerald-400';
    } else if (node.type === 'facility') {
        icon = HeartHandshake;
        iconColor = 'text-rose-400';
        glowColor = 'bg-rose-500/20';
        ringColor = 'border-rose-500/30';
        activeGlow = 'shadow-[0_0_20px_rgba(244,63,94,0.6)]';
        bgClass = 'bg-rose-500/10';
        textClass = 'text-rose-400';
    } else if (node.type === 'track') {
        icon = Circle;
        iconColor = 'text-blue-400';
        glowColor = 'bg-blue-500/20';
        ringColor = 'border-blue-500/30';
        activeGlow = 'shadow-[0_0_20px_rgba(59,130,246,0.6)]';
        bgClass = 'bg-blue-500/10';
        textClass = 'text-blue-400';
    } else {
        // default POI
        icon = MapPin;
        iconColor = 'text-amber-400';
        glowColor = 'bg-amber-500/20';
        ringColor = 'border-amber-500/30';
        activeGlow = 'shadow-[0_0_20px_rgba(251,191,36,0.6)]';
        bgClass = 'bg-amber-500/10';
        textClass = 'text-amber-400';
    }

    return {icon, iconColor, glowColor, ringColor, activeGlow, bgClass, textClass};
}

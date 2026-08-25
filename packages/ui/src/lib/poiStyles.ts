import type {LucideIcon} from 'lucide-react';
import * as Icons from 'lucide-react';
import type {NodeBaseType, NodeCategory} from './types';

export interface POIStyle {
    icon: LucideIcon;
    iconColor: string;
    glowColor: string;
    ringColor: string;
    activeGlow: string;
    bgClass: string;
    textClass: string;
}

const COLOR_THEME_STYLES: Record<string, Omit<POIStyle, 'icon'>> = {
    amber: {iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', ringColor: 'border-amber-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400'},
    blue: {iconColor: 'text-blue-400', glowColor: 'bg-blue-500/20', ringColor: 'border-blue-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400'},
    cyan: {iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20', ringColor: 'border-cyan-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400'},
    emerald: {iconColor: 'text-emerald-400', glowColor: 'bg-emerald-500/20', ringColor: 'border-emerald-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400'},
    fuchsia: {iconColor: 'text-fuchsia-400', glowColor: 'bg-fuchsia-500/20', ringColor: 'border-fuchsia-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-fuchsia-500/10', textClass: 'text-fuchsia-400'},
    gray: {iconColor: 'text-gray-400', glowColor: 'bg-gray-500/20', ringColor: 'border-gray-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-gray-500/10', textClass: 'text-gray-400'},
    green: {iconColor: 'text-green-400', glowColor: 'bg-green-500/20', ringColor: 'border-green-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-green-500/10', textClass: 'text-green-400'},
    indigo: {iconColor: 'text-indigo-400', glowColor: 'bg-indigo-500/20', ringColor: 'border-indigo-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-indigo-500/10', textClass: 'text-indigo-400'},
    lime: {iconColor: 'text-lime-400', glowColor: 'bg-lime-500/20', ringColor: 'border-lime-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-lime-500/10', textClass: 'text-lime-400'},
    neutral: {iconColor: 'text-neutral-400', glowColor: 'bg-neutral-500/20', ringColor: 'border-neutral-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-neutral-500/10', textClass: 'text-neutral-400'},
    orange: {iconColor: 'text-orange-400', glowColor: 'bg-orange-500/20', ringColor: 'border-orange-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-orange-500/10', textClass: 'text-orange-400'},
    pink: {iconColor: 'text-pink-400', glowColor: 'bg-pink-500/20', ringColor: 'border-pink-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-pink-500/10', textClass: 'text-pink-400'},
    purple: {iconColor: 'text-purple-400', glowColor: 'bg-purple-500/20', ringColor: 'border-purple-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-purple-500/10', textClass: 'text-purple-400'},
    red: {iconColor: 'text-red-400', glowColor: 'bg-red-500/20', ringColor: 'border-red-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-red-500/10', textClass: 'text-red-400'},
    rose: {iconColor: 'text-rose-400', glowColor: 'bg-rose-500/20', ringColor: 'border-rose-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-rose-500/10', textClass: 'text-rose-400'},
    slate: {iconColor: 'text-slate-400', glowColor: 'bg-slate-500/20', ringColor: 'border-slate-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-slate-500/10', textClass: 'text-slate-400'},
    sky: {iconColor: 'text-sky-400', glowColor: 'bg-sky-500/20', ringColor: 'border-sky-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-sky-500/10', textClass: 'text-sky-400'},
    stone: {iconColor: 'text-stone-400', glowColor: 'bg-stone-500/20', ringColor: 'border-stone-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-stone-500/10', textClass: 'text-stone-400'},
    teal: {iconColor: 'text-teal-400', glowColor: 'bg-teal-500/20', ringColor: 'border-teal-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-teal-500/10', textClass: 'text-teal-400'},
    violet: {iconColor: 'text-violet-400', glowColor: 'bg-violet-500/20', ringColor: 'border-violet-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-violet-500/10', textClass: 'text-violet-400'},
    yellow: {iconColor: 'text-yellow-400', glowColor: 'bg-yellow-500/20', ringColor: 'border-yellow-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-400'},
    zinc: {iconColor: 'text-zinc-400', glowColor: 'bg-zinc-500/20', ringColor: 'border-zinc-500/30', activeGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]', bgClass: 'bg-zinc-500/10', textClass: 'text-zinc-400'},
};

export function getPOIStyle(node: { category?: NodeCategory }): POIStyle {
    const { category } = node;

    // Use category color theme if available
    const theme = category?.color_theme || 'amber';

    let icon: LucideIcon = Icons.MapPin;
    if (category?.icon_key && (Icons as any)[category.icon_key]) {
        icon = (Icons as any)[category.icon_key];
    } else {
        // Fallbacks for base types if DB icon is missing
        const type = category?.base_type;
        if (type === 'stamp') icon = Icons.Gem;
        else if (type === 'gate') icon = Icons.DoorClosed;
        else if (type === 'utility_major') icon = Icons.Droplets;
        else if (type === 'utility_minor') icon = Icons.Trash2;
        else if (type === 'intersection') icon = Icons.Circle;
    }

    return {
        icon,
        ...(COLOR_THEME_STYLES[theme] || COLOR_THEME_STYLES.amber),
    };
}

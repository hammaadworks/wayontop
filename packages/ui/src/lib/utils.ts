import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import type { GraphNode, NodeCategory, LocalizedText } from "./types";

export function getLocalizedText(
    textObj: LocalizedText | undefined | null,
    lang: string,
    fallbackLang: string = 'en'
): string {
    if (!textObj) return '';
    // safely attempt to get the language string, cast as any in case lang is arbitrary
    const str = (textObj as any)[lang];
    if (str && str.trim().length > 0) return str;
    return (textObj as any)[fallbackLang] || '';
}

export function getNodeName(node: GraphNode | null | undefined, lang: string): string {
    if (!node) return 'Unknown';
    const name = getLocalizedText(node.name, lang);
    if (name) return name;
    return getLocalizedText(node.category?.name, lang) || 'Unknown';
}

export function getNodeDescription(node: GraphNode | null | undefined, lang: string): string {
    if (!node) return '';
    const desc = getLocalizedText(node.description, lang);
    if (desc) return desc;
    
    const extraDesc = typeof node.extra_info === 'string' ? node.extra_info : getLocalizedText(node.extra_info, lang);
    if (extraDesc) return extraDesc;

    return getLocalizedText(node.category?.description, lang) || '';
}

export function getNodeCategoryName(category: NodeCategory | null | undefined, lang: string): string {
    if (!category) return '';
    return getLocalizedText(category.name, lang);
}

import React from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import type { Stamp } from '@wayontop/ui/lib/types';
import { Gamification } from '../lib/gamification';

interface StampCollectionProps {
    stamps: Stamp[];
    onClose: () => void;
    onStampSelect: (stamp: Stamp) => void;
}

export function StampCollection({ stamps, onClose, onStampSelect }: StampCollectionProps) {
    const collectedStampIds = Gamification.getCollectedStamps();
    const collectedCount = stamps.filter(s => collectedStampIds.includes(s.id)).length;
    
    return (
        <div className="fixed inset-0 z-[9999] bg-[#f8f9fa] flex flex-col animate-in slide-in-from-bottom-full duration-500 font-sans">
            {/* Header */}
            <div className="pt-14 pb-4 px-6 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm z-10">
                <button 
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-serif">Collection</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#f8f9fa]">
                <div className="mb-8 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Your Progress</h2>
                        <p className="text-3xl font-black text-slate-900">
                            {collectedCount} <span className="text-lg text-slate-400 font-medium">/ {stamps.length}</span>
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-emerald-500"
                                strokeDasharray={`${stamps.length ? (collectedCount / stamps.length) * 100 : 0}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                        </svg>
                        <span className="text-sm font-bold text-slate-900">
                            {stamps.length ? Math.round((collectedCount / stamps.length) * 100) : 0}%
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {stamps.map(stamp => {
                        const isCollected = collectedStampIds.includes(stamp.id);
                        const imageUrl = stamp.image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2727&auto=format&fit=crop';
                        
                        return (
                            <button
                                key={stamp.id}
                                disabled={!isCollected}
                                onClick={() => onStampSelect(stamp)}
                                className={`relative aspect-[3/4] rounded-[24px] overflow-hidden transition-all duration-300 text-left ${
                                    isCollected 
                                        ? 'shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95' 
                                        : 'opacity-60 grayscale-[0.8] contrast-75 bg-slate-200'
                                }`}
                            >
                                <img 
                                    src={imageUrl} 
                                    alt={stamp.name}
                                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isCollected ? 'group-hover:scale-105' : ''}`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                                
                                <div className="absolute bottom-4 left-4 right-4 z-10">
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1 opacity-90">
                                        {isCollected ? stamp.rarity : 'Locked'}
                                    </div>
                                    <h3 className="text-white font-bold leading-tight font-serif text-lg">
                                        {isCollected ? stamp.name : 'Unknown'}
                                    </h3>
                                </div>

                                {!isCollected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                        <div className="bg-black/50 p-3 rounded-full backdrop-blur-md">
                                            <Lock className="w-5 h-5 text-white/80" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

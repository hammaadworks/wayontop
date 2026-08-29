import {X, Sparkles} from 'lucide-react';
import type {Stamp} from '@wayontop/ui/lib/types';
import {useTranslation} from 'react-i18next';

interface StampModalProps {
    stamps: Stamp[];
    collectedStampIds: number[];
    onClose: () => void;
    onFindStamps: () => void;
}

export function StampModal({stamps, collectedStampIds, onClose, onFindStamps}: Readonly<StampModalProps>) {
    const {t} = useTranslation();
    const collectedCount = stamps.filter(s => collectedStampIds.includes(s.id)).length;
    const totalCount = stamps.length;
    const progressPercent = totalCount > 0 ? (collectedCount / totalCount) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#1C1C1E] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-amber-900/20 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative p-6 text-center border-b border-white/5 bg-gradient-to-b from-amber-500/10 to-transparent">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                    <div className="w-12 h-12 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Your Passport</h3>
                    <p className="text-sm text-amber-200/80">
                        {collectedCount} of {totalCount} Stamps Found
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mt-4 w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 ease-out" 
                            style={{width: `${progressPercent}%`}}
                        />
                    </div>
                </div>

                {/* Carousel */}
                <div className="p-6">
                    <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                        {stamps.map(stamp => {
                            const isCollected = collectedStampIds.includes(stamp.id);
                            return (
                                <div 
                                    key={stamp.id} 
                                    className="snap-center shrink-0 w-[200px] aspect-[3/4] rounded-2xl overflow-hidden relative group"
                                >
                                    {isCollected ? (
                                        // Collected State
                                        <div className="w-full h-full relative">
                                            {stamp.image_url ? (
                                                <img src={stamp.image_url} alt={stamp.name || 'Stamp'} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-emerald-600 flex items-center justify-center">
                                                    <Sparkles className="w-12 h-12 text-emerald-300 opacity-50" />
                                                </div>
                                            )}
                                            {/* Gradient overlay for text */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-1">
                                                    Collected
                                                </div>
                                                <h4 className="text-white font-bold text-lg leading-tight">{t(stamp.name || '')}</h4>
                                            </div>
                                        </div>
                                    ) : (
                                        // Uncollected / Mystery State
                                        <div className="w-full h-full relative bg-[#111112] border-2 border-dashed border-white/10 flex flex-col items-center justify-center">
                                            {stamp.image_url ? (
                                                <img src={stamp.image_url} alt="Mystery" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale blur-sm" />
                                            ) : (
                                                <Sparkles className="w-12 h-12 text-white/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#111112] via-transparent to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                                                <div className="text-3xl mb-2 opacity-30">🔒</div>
                                                <h4 className="text-white/40 font-bold text-sm">Mystery Stamp</h4>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-2">
                    <button 
                        onClick={onFindStamps}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                    >
                        Hunt for Stamps
                    </button>
                </div>
            </div>
        </div>
    );
}

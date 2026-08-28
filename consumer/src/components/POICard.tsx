import { X, Navigation, Sparkles, Eye } from 'lucide-react';
import type { GraphNode } from '@wayontop/ui/lib/types';
import { useTranslation } from 'react-i18next';
import { Button } from '@wayontop/ui/components/ui/button';
import { Badge } from '@wayontop/ui/components/ui/badge';
import { Gamification } from '../lib/gamification';
import { useState } from 'react';

interface POICardProps {
  poi: GraphNode;
  onClose: () => void;
  onNavigate: () => void;
}

import { getNodeName, getNodeDescription } from '@wayontop/ui/lib/utils';

export function POICard({ poi, onClose, onNavigate }: POICardProps) {
  const { t, i18n } = useTranslation();
  const [isRevealed, setIsRevealed] = useState(false);

  const isStamp = poi.category?.base_type === 'stamp';
  const isUncollectedStamp = isStamp && !Gamification.getCollectedStamps().includes(poi.id);
  const showMystery = isUncollectedStamp && !isRevealed;

  const title = showMystery ? 'Mystery Stamp' : getNodeName(poi, i18n.language);
  const desc = showMystery ? 'Go to this location in the real world to reveal and collect this stamp! Or use a hint to reveal it now.' : getNodeDescription(poi, i18n.language);
  const actualImgUrl = poi.image_url || poi.category?.image_url;

  // If there's an image and description, or it's a stamp, allow expanding to full screen
  const hasFullCard = !!(actualImgUrl && desc) || isStamp;

  const renderBadges = () => (
    <div className="flex gap-2 mt-1.5 flex-wrap">
      {poi.is_paid && (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0 text-[10px] uppercase tracking-widest shrink-0">
          ₹ Paid
        </Badge>
      )}
      {poi.status === 'construction' && (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0 text-[10px] uppercase tracking-widest shrink-0">
          🚧 Closed
        </Badge>
      )}
      {poi.category?.base_type === 'stamp' && (
        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0 text-[10px] uppercase tracking-widest shrink-0">
          ✨ Collectible
        </Badge>
      )}
    </div>
  );

  if (!hasFullCard) {
    // Minimalist Bottom Sheet for nodes without extra info
    return (
      <div className="fixed inset-x-0 bottom-0 z-[60] p-4 flex justify-center pointer-events-none">
        <div className="w-full max-w-md bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{t(title)}</h2>
              {renderBadges()}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-white/5 text-white/50 hover:text-white hover:bg-white/10 rounded-full shrink-0 h-8 w-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-6 text-lg font-bold shadow-lg shadow-emerald-500/20"
            onClick={onNavigate}
          >
            <Navigation className="w-5 h-5 mr-2" />
            Navigate Here
          </Button>
        </div>
      </div>
    );
  }

  // Full Promo Card for nodes with image and extra_info
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4">
      <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
        {/* 4:3 Image Area */}
        <div className="relative w-full aspect-[4/3] bg-black shrink-0 flex flex-col items-center justify-center">
          {actualImgUrl ? (
             <img src={actualImgUrl} alt={title} className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${showMystery ? 'opacity-30 grayscale blur-xl' : 'opacity-90'}`} />
          ) : (
             <Sparkles className={`w-16 h-16 transition-all duration-1000 ${showMystery ? 'text-white/20' : 'text-emerald-500/40'}`} />
          )}
          {showMystery && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-6xl opacity-50 drop-shadow-2xl">🔒</div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/20 to-transparent pointer-events-none" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 bg-black/40 text-white hover:bg-black/60 rounded-full z-10 backdrop-blur-md"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="absolute bottom-4 left-4 z-10 pr-4">
            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg leading-tight">{t(title)}</h2>
            {renderBadges()}
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${showMystery ? 'text-white/40 italic text-center py-2' : 'text-white/80'}`}>
            {desc}
          </div>

          <div className="flex flex-col gap-3 shrink-0 mt-auto">
            {showMystery && (
                <Button 
                  className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 rounded-2xl py-6 text-lg font-bold transition-all"
                  onClick={() => setIsRevealed(true)}
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Reveal Hint
                </Button>
            )}
            <Button 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-6 text-lg font-bold shadow-[0_8px_30px_rgba(16,185,129,0.3)] shrink-0"
              onClick={onNavigate}
            >
              <Navigation className="w-5 h-5 mr-2" />
              Navigate Here
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

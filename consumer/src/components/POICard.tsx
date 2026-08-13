import { X, Navigation } from 'lucide-react';
import type { GraphNode } from '@wayontop/ui/lib/types';
import { useTranslation } from 'react-i18next';
import { Button } from '@wayontop/ui/components/ui/button';

interface POICardProps {
  poi: GraphNode;
  onClose: () => void;
  onNavigate: () => void;
}

export function POICard({ poi, onClose, onNavigate }: POICardProps) {
  const { t } = useTranslation();

  const hasFullCard = !!(poi.image_url && poi.extra_info);

  if (!hasFullCard) {
    // Minimalist Bottom Sheet for nodes without extra info
    return (
      <div className="fixed inset-x-0 bottom-0 z-[60] p-4 flex justify-center pointer-events-none">
        <div className="w-full max-w-md bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{t(poi.name)}</h2>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {poi.tags && poi.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold text-white/70 uppercase tracking-wider">
                    {t(tag)}
                  </span>
                ))}
              </div>
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
        <div className="relative w-full aspect-[4/3] bg-black shrink-0">
          <img src={poi.image_url} alt={poi.name} className="absolute inset-0 w-full h-full object-cover opacity-90" />
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
            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg leading-tight">{t(poi.name)}</h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              {poi.tags && poi.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-medium text-white/90 capitalize border border-white/10 shadow-sm">
                  {t(tag)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
            {poi.extra_info}
          </div>

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
  );
}

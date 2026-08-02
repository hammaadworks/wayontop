import { X, Info, Camera, Users, BookOpen } from 'lucide-react';
import type { GraphNode } from '@wayontop/ui/lib/types';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

interface POICardProps {
  poi: GraphNode;
  onClose: () => void;
  onNavigate: () => void;
}

export function POICard({ poi, onClose, onNavigate }: POICardProps) {
  const { t } = useTranslation();

  // In a real implementation, this would come from the database
  const poiInfo = {
    famous_for: "The beautiful structure and historical significance.",
    photo_spot: "Stand near the main entrance for the best lighting.",
    crowded: "Usually moderately crowded in the evenings.",
    facts: "It was built many decades ago and stands as a testament to the local culture.",
    history: "Originally established as a small garden, it has grown over the centuries."
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4">
      <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
        <div className="relative h-48 bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 bg-black/40 text-white hover:bg-black/60 rounded-full"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="absolute bottom-4 left-4">
            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{poi.name}</h2>
            <div className="flex gap-2 mt-2">
              {poi.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs text-white/90 capitalize">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white/90">{t('poi_info.famous_for')}</h4>
                <p className="text-sm text-white/60">{poiInfo.famous_for}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-pink-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white/90">{t('poi_info.photo_spot')}</h4>
                <p className="text-sm text-white/60">{poiInfo.photo_spot}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white/90">{t('poi_info.crowded')}</h4>
                <p className="text-sm text-white/60">{poiInfo.crowded}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white/90">{t('poi_info.facts')}</h4>
                <p className="text-sm text-white/60">{poiInfo.facts}</p>
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-6 text-lg font-semibold shadow-lg shadow-emerald-500/20"
            onClick={onNavigate}
          >
            Navigate Here
          </Button>
        </div>
      </div>
    </div>
  );
}

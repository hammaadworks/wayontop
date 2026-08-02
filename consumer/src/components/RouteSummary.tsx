import { useEffect, useState } from 'react';
import { X, Share2, MapPin, Footprints, Flame, Timer } from 'lucide-react';
import { ViralSharing } from '../lib/sharing';
import { Gamification } from '../lib/gamification';
import { useTranslation } from 'react-i18next';

interface RouteSummaryProps {
  onClose: () => void;
  routeTrack: { lat: number; lng: number }[];
  distanceWalked: number; // in meters
  startTime: Date;
}

export function RouteSummary({ onClose, distanceWalked, startTime }: RouteSummaryProps) {
  const { t } = useTranslation();
  const [stampsCount, setStampsCount] = useState(0);
  
  useEffect(() => {
    setStampsCount(Gamification.getCollectedStamps().length);
  }, []);

  const durationMs = new Date().getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  const formattedTime = `${minutes}m ${seconds}s`;
  
  // Roughly 1.3 meters per step
  const steps = Math.floor(distanceWalked / 1.3);
  // Roughly 0.04 calories per step
  const calories = Math.floor(steps * 0.04);
  const distKm = (distanceWalked / 1000).toFixed(2);

  const handleShare = () => {
    ViralSharing.shareText(
      'Lalbagh Explorer',
      `I just explored Lalbagh Botanical Garden! 🌳✨\n🚶 ${distKm}km walked\n⏱️ ${formattedTime}\n🏅 ${stampsCount} stamps found!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-5 animate-in fade-in duration-700">
      <div className="glass-panel w-full max-w-sm overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-12 duration-1000 spring-bounce relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-black/60"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-10 h-10 bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header */}
        <div className="h-48 relative overflow-hidden flex flex-col items-center justify-center border-b border-white/5">
           <div className="absolute inset-0 bg-mesh-dark opacity-80 mix-blend-screen"></div>
           <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)] mb-3">
             <MapPin className="w-10 h-10 text-white drop-shadow-md" />
           </div>
           <div className="relative z-10 font-extrabold text-white tracking-[0.2em] uppercase text-[10px] bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
             {t('expedition_complete')}
           </div>
        </div>

        {/* Stats Grid */}
        <div className="p-7 relative z-10">
          <h2 className="text-[28px] font-extrabold tracking-tight text-white mb-8 text-center drop-shadow-md">{t('your_journey')}</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-bl-full blur-xl"></div>
              <Footprints className="w-7 h-7 text-amber-400 mb-3 drop-shadow-sm" />
              <span className="text-3xl font-extrabold text-white tracking-tight">{steps}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold mt-1">{t('steps')}</span>
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-bl-full blur-xl"></div>
              <Timer className="w-7 h-7 text-blue-400 mb-3 drop-shadow-sm" />
              <span className="text-3xl font-extrabold text-white tracking-tight">{distKm}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold mt-1">{t('kilometers')}</span>
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-pink-400/10 rounded-bl-full blur-xl"></div>
              <Flame className="w-7 h-7 text-pink-400 mb-3 drop-shadow-sm" />
              <span className="text-3xl font-extrabold text-white tracking-tight">{calories}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold mt-1">{t('calories')}</span>
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-400/10 rounded-bl-full blur-xl"></div>
              <MapPin className="w-7 h-7 text-purple-400 mb-3 drop-shadow-sm" />
              <span className="text-3xl font-extrabold text-white tracking-tight">{stampsCount}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold mt-1">{t('stamps')}</span>
            </div>
          </div>

          <div className="glass-pill px-4 py-2 mx-auto w-fit mb-8 border-white/10">
            <p className="text-white/70 text-xs font-semibold tracking-wide">
              {t('duration')}: <span className="text-white">{formattedTime}</span>
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-emerald-950 font-bold py-4 px-6 rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-300 text-lg tracking-wide"
            >
              <Share2 className="w-5 h-5" /> {t('share_run')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import {Combine, Layers} from 'lucide-react';
import {Popover, PopoverContent, PopoverTrigger} from '@wayontop/ui/components/ui/popover';

interface TopNavigationBarProps {
    venueKey: string;
    mapSkin: 'satellite' | 'animated';
    setMapSkin: (skin: 'satellite' | 'animated') => void;
    layers: any;
    setLayers: React.Dispatch<React.SetStateAction<any>>;
    currentAccuracy: number | null;
    saveGraph: () => void;
    onBack: () => void;
    isLocked: boolean;
    mode: string;
    setMode: (mode: any) => void;
    pipVisible: boolean;
    togglePip: () => void;
}

export function TopNavigationBar({
                                     venueKey,
                                     mapSkin,
                                     setMapSkin,
                                     layers,
                                     setLayers,
                                     currentAccuracy,
                                     saveGraph,
                                     onBack,
                                     isLocked,
                                     mode,
                                     setMode,
                                     pipVisible,
                                     togglePip
                                 }: Readonly<TopNavigationBarProps>) {
    const getAccuracyClass = (acc: number) => {
        if (acc <= 5) return 'bg-emerald-400 text-emerald-400';
        if (acc <= 15) return 'bg-amber-400 text-amber-400';
        return 'bg-red-500 text-red-500 animate-pulse';
    };

    return (
        <div
            className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-105 pointer-events-none">
            <div
                className="pointer-events-auto glass-pill p-1 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/10 flex items-center justify-between w-full bg-black/60 backdrop-blur-3xl rounded-[2rem] gap-2">

                <button
                    type="button"
                    className="h-10 px-4 flex items-center hover:bg-white/10 active:scale-95 transition-all rounded-full shrink-0 cursor-pointer group"
                    onClick={() => {
                        saveGraph();
                        onBack();
                    }}>
                    <span
                        className="text-xs font-black text-emerald-400 uppercase tracking-widest truncate max-w-[150px] group-hover:text-emerald-300 transition-colors">
                        {venueKey}
                    </span>
                </button>

                <div
                    className="flex items-center bg-black/40 backdrop-blur-3xl rounded-full p-1 border border-white/5 shadow-inner">
                    <button onClick={() => setMapSkin('satellite')}
                            className={`w-12 py-1.5 text-[10px] uppercase tracking-wider rounded-full font-bold transition-all ${mapSkin === 'satellite' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Sat
                    </button>
                    <button onClick={() => setMapSkin('animated')}
                            className={`w-12 py-1.5 text-[10px] uppercase tracking-wider rounded-full font-bold transition-all ${mapSkin === 'animated' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Map
                    </button>
                </div>

                <div
                    className="flex items-center bg-black/40 backdrop-blur-3xl rounded-full p-1 border border-white/5 shadow-inner gap-1 mr-1">
                    <button
                        onClick={() => {
                            if (isLocked) {
                                import('sonner').then(m => m.toast.info("Unlock edit mode to merge nodes into one"));
                            } else {
                                setMode(mode === 'merge_nodes' ? 'view' : 'merge_nodes');
                            }
                        }}
                        title={isLocked ? "Merges multiple nodes into one in edit mode" : "Draw area to merge nodes"}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all outline-none ${mode === 'merge_nodes' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse' : (isLocked ? 'text-slate-500 cursor-help' : 'text-slate-300 hover:text-white hover:bg-white/10')}`}
                    >
                        <Combine className="w-4 h-4"/>
                    </button>

                    <div className="w-px h-4 bg-white/20 mx-0.5"/>

                    <Popover>
                        <PopoverTrigger
                            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all group cursor-pointer outline-none">
                            <Layers className="w-4 h-4 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"/>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-52 p-3 glass-panel bg-black/90 backdrop-blur-3xl border-emerald-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl text-white pointer-events-auto"
                            align="end" sideOffset={12}>
                            <div className="flex items-center gap-2 px-3 pb-3 border-b border-white/10 mb-3">
                                <div
                                    className="p-1.5 bg-emerald-500/20 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                    <Layers className="w-3.5 h-3.5 text-emerald-400 drop-shadow-md"/>
                                </div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Map Layers</span>
                            </div>
                            <div className="space-y-1">
                                <label
                                    className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                <span
                                    className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">Points of Interest</span>
                                    <input type="checkbox" checked={layers.pois}
                                           onChange={e => setLayers((l: any) => ({...l, pois: e.target.checked}))}
                                           className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                </label>
                                <label
                                    className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                <span
                                    className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">Tracks (Hidden)</span>
                                    <input type="checkbox" checked={layers.tracks}
                                           onChange={e => setLayers((l: any) => ({...l, tracks: e.target.checked}))}
                                           className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                </label>
                                <label
                                    className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                <span
                                    className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">Path Connections</span>
                                    <input type="checkbox" checked={layers.paths}
                                           onChange={e => setLayers((l: any) => ({...l, paths: e.target.checked}))}
                                           className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                </label>
                                <div className="h-px bg-white/10 my-1 mx-3"/>
                                <label
                                    className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                <span
                                    className="text-[11px] font-bold text-amber-300 group-hover:text-amber-400 transition-colors">Filled Sponsor Zones</span>
                                    <input type="checkbox" checked={layers.filledSponsors}
                                           onChange={e => setLayers((l: any) => ({
                                               ...l,
                                               filledSponsors: e.target.checked
                                           }))}
                                           className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                </label>
                                <label
                                    className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                <span
                                    className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">Open Sponsor Slots</span>
                                    <input type="checkbox" checked={layers.openSponsors}
                                           onChange={e => setLayers((l: any) => ({
                                               ...l,
                                               openSponsors: e.target.checked
                                           }))}
                                           className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                </label>
                                <div className="h-px bg-white/10 my-1 mx-3"/>
                                <label
                                    className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group"
                                    title="Shows your live recorded trail">
                                <span
                                    className="text-[11px] font-bold text-red-300 group-hover:text-red-400 transition-colors">GPS Trace (Recording)</span>
                                    <input type="checkbox" checked={layers.trace}
                                           onChange={e => setLayers((l: any) => ({...l, trace: e.target.checked}))}
                                           className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                </label>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Accuracy Indicator */}
            {currentAccuracy !== null && (
                <div
                    onClick={togglePip}
                    className={`pointer-events-auto mt-2 mx-auto w-fit glass-pill px-3 py-1.5 shadow-lg border flex items-center gap-2 backdrop-blur-3xl rounded-full transition-all cursor-pointer hover:bg-white/10 active:scale-95 ${pipVisible ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/60 border-white/10'}`}>
                    <div
                        className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${getAccuracyClass(currentAccuracy)}`}/>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-200">
                        GPS: {Math.round(currentAccuracy)}m
                    </span>
                    {currentAccuracy > 15 && (
                        <span className="text-[10px] text-red-300 font-bold border-l border-white/20 pl-2">
                            Move outdoors / Calibrate compass
                        </span>
                    )}
                    {currentAccuracy > 5 && currentAccuracy <= 15 && (
                        <span className="text-[10px] text-amber-300 font-bold border-l border-white/20 pl-2">
                            Stay still to improve
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

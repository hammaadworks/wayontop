import {useState, useEffect} from 'react';
import {LocateFixed, Pencil, Play, Redo2, Square, Undo2, MousePointer2, MousePointerClick, ArrowRight, Eraser} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {toast} from 'sonner';

interface MapFloatingControlsProps {
    mapRef: React.RefObject<any>;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    currentLocation: { lat: number, lng: number } | null;
    recording: boolean;
    setRecording: (val: boolean) => void;
    mode: string;
    setMode: (mode: any) => void;
    setEdgeStartNode: (node: any) => void;
    isLocked: boolean;
    intersectionsClickable: boolean;
    setIntersectionsClickable: (val: boolean) => void;
    setTestRoutePath: (path: any) => void;
    setSelectedNode: (node: any) => void;
    setSelectedEdge: (edge: any) => void;
}

export function MapFloatingControls({
                                        mapRef,
                                        canUndo,
                                        canRedo,
                                        undo,
                                        redo,
                                        currentLocation,
                                        recording,
                                        setRecording,
                                        mode,
                                        setMode,
                                        setEdgeStartNode,
                                        isLocked,
                                        intersectionsClickable,
                                        setIntersectionsClickable,
                                        setTestRoutePath,
                                        setSelectedNode,
                                        setSelectedEdge
                                    }: Readonly<MapFloatingControlsProps>) {
    const [localBearing, setLocalBearing] = useState(0);

    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current.getMap();
        if (!map) return;
        
        setLocalBearing(map.getBearing());
        const onRotate = () => setLocalBearing(map.getBearing());
        map.on('rotate', onRotate);
        return () => {
            map.off('rotate', onRotate);
        };
    }, [mapRef]);

    const getDirection = (b: number) => {
        const normalized = (b + 360) % 360;
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(normalized / 45) % 8];
    };

    const isTouchup = typeof window !== 'undefined' && window.location.search.includes('touchup=true');

    return (
        <>
            {/* Left Floating Action Buttons */}
            <div
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-4 md:left-6 z-10 flex flex-col gap-2 items-center p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 bg-black/60 backdrop-blur-3xl rounded-full">
                
                <Button variant="ghost" size="icon"
                        className="rounded-full w-10 h-10 flex flex-col items-center justify-center p-0 bg-slate-500/20 hover:bg-slate-500/40 transition-all border border-transparent hover:border-slate-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
                        onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.easeTo({bearing: 0, pitch: 0, duration: 800});
                            }
                        }}>
                    <span
                        className={`text-[12px] font-black leading-none drop-shadow-md ${getDirection(localBearing) === 'N' ? 'text-red-500' : 'text-slate-300'}`}>
                        {getDirection(localBearing)}
                    </span>
                    <span className="text-[8px] font-bold leading-none text-emerald-400 mt-0.5 drop-shadow-sm">
                        {Math.round((localBearing + 360) % 360)}°
                    </span>
                </Button>

                <Button variant="ghost" size="icon"
                        className={`rounded-full w-10 h-10 transition-all border ${intersectionsClickable ? 'bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border-indigo-500/30' : 'bg-slate-500/20 text-slate-400 hover:text-slate-300 border-transparent hover:border-slate-500/30'}`}
                        onClick={() => setIntersectionsClickable(!intersectionsClickable)}
                        title={intersectionsClickable ? "Intersection nodes are clickable" : "Intersection nodes are unclickable"}
                >
                    {intersectionsClickable ? <MousePointerClick className="w-5 h-5 drop-shadow-md" /> : <MousePointer2 className="w-5 h-5 drop-shadow-md opacity-50" />}
                </Button>

                <Button variant="ghost" size="icon" disabled={!canUndo || isLocked}
                        className="rounded-full w-10 h-10 bg-slate-500/20 text-slate-300 hover:text-emerald-400 hover:bg-slate-500/40 transition-all border border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)] disabled:opacity-30"
                        onClick={undo}>
                    <Undo2 className="w-5 h-5 drop-shadow-md"/>
                </Button>
                <Button variant="ghost" size="icon" disabled={!canRedo || isLocked}
                        className="rounded-full w-10 h-10 bg-slate-500/20 text-slate-300 hover:text-emerald-400 hover:bg-slate-500/40 transition-all border border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)] disabled:opacity-30"
                        onClick={redo}>
                    <Redo2 className="w-5 h-5 drop-shadow-md"/>
                </Button>
            </div>

            {/* Right Floating Action Buttons */}
            <div
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] right-4 md:right-6 z-10 flex flex-col gap-2 items-center p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 bg-black/60 backdrop-blur-3xl rounded-full">
                <Button variant="ghost" size="icon"
                        className="rounded-full w-10 h-10 bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/40 transition-all border border-transparent hover:border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        onClick={() => {
                            if (mapRef.current && currentLocation) {
                                mapRef.current.flyTo({
                                    center: [currentLocation.lng, currentLocation.lat],
                                    zoom: 18,
                                    essential: true
                                });
                            } else {
                                toast.error("Waiting for GPS signal...");
                            }
                        }}>
                    <LocateFixed className="w-5 h-5 drop-shadow-md"/>
                </Button>
                <Button variant="ghost" size="icon"
                        className={`rounded-full w-10 h-10 transition-all border ${mode === 'add_edge' ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/40 border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
                        onClick={() => {
                            if (mode === 'add_edge') {
                                setMode('view');
                                setEdgeStartNode(null);
                            } else {
                                setMode('add_edge');
                                setEdgeStartNode(null);
                            }
                        }}>
                    <Pencil className="w-5 h-5 drop-shadow-md"/>
                </Button>
                <Button variant="ghost" size="icon"
                        disabled={isTouchup}
                        className={`rounded-full w-10 h-10 transition-all border ${!recording ? 'bg-amber-500/20 text-amber-400 hover:text-amber-300 hover:bg-amber-500/40 border-transparent hover:border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        onClick={() => {
                            if (isTouchup) {
                                toast.error('GPS recording disabled in touchup mode');
                                return;
                            }
                            if (recording) {
                                setRecording(false);
                                toast.info('Stopped recording path');
                            } else {
                                setRecording(true);
                                toast.success('Started recording path');
                            }
                        }}>
                    {recording ? <Square className="w-5 h-5 drop-shadow-md"/> :
                        <Play className="w-5 h-5 drop-shadow-md ml-0.5"/>}
                </Button>
                {isLocked ? (
                    <Button variant="ghost" size="icon"
                            className={`rounded-full w-10 h-10 transition-all border ${mode === 'test_route' ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.8)]' : 'bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/40 border-transparent hover:border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}
                            onClick={() => {
                                if (mode === 'test_route') {
                                    setMode('view');
                                    setTestRoutePath(null);
                                    setSelectedNode(null);
                                } else {
                                    setMode('test_route');
                                    setEdgeStartNode(null);
                                    setTestRoutePath(null);
                                    setSelectedNode(null);
                                }
                            }}>
                        <ArrowRight className="w-5 h-5 drop-shadow-md"/>
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon"
                            className={`rounded-full w-10 h-10 transition-all border ${mode === 'erase' ? 'bg-red-600 text-white border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.8)]' : 'bg-red-600/20 text-red-400 hover:text-red-300 hover:bg-red-600/40 border-transparent hover:border-red-600/30 shadow-[0_0_15px_rgba(220,38,38,0.2)]'}`}
                            onClick={() => {
                                if (mode === 'erase') {
                                    setMode('view');
                                } else {
                                    setMode('erase');
                                    setEdgeStartNode(null);
                                    setTestRoutePath(null);
                                    setSelectedNode(null);
                                    setSelectedEdge(null);
                                }
                            }}>
                        <Eraser className="w-5 h-5 drop-shadow-md"/>
                    </Button>
                )}
            </div>
        </>
    );
}

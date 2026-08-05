import {AlertCircle, ArrowRight, Check, Loader2, Lock, MapPin, Save, Unlock, WifiOff} from 'lucide-react';
import type {GraphNode, GraphEdge} from '@wayontop/ui/lib/types';
import {Button} from '@wayontop/ui/components/ui/button';
import {toast} from 'sonner';
import {SponsorManager} from '../SponsorManager';
import {SpecialToast} from '@wayontop/ui/components/ui/special-toast';

interface MapBottomBarProps {
    mode: 'view' | 'add_node' | 'add_edge' | 'test_route';
    setMode: (mode: 'view' | 'add_node' | 'add_edge' | 'test_route') => void;
    isLocked: boolean;
    setIsLocked: (val: boolean) => void;
    edgeStartNode: GraphNode | null;
    setEdgeStartNode: (node: GraphNode | null) => void;
    setTestRoutePath: (path: any) => void;
    setSelectedNode: (node: GraphNode | null) => void;
    setSelectedEdge: (edge: GraphEdge | null) => void;
    syncState: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'offline';
    saveGraph: () => void;
    data: any;
    setData: any;
}

export function MapBottomBar({
                                 mode, setMode, isLocked, setIsLocked, edgeStartNode, setEdgeStartNode, setTestRoutePath,
                                 setSelectedNode, setSelectedEdge, syncState, saveGraph, data, setData
                             }: MapBottomBarProps) {
    return (
        <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[420px] flex flex-col items-center gap-5">
            
            <SpecialToast
                visible={mode === 'add_edge'}
                message={edgeStartNode ? 'Select target node' : 'Select start node'}
                icon={<ArrowRight className="w-4 h-4"/>}
            />

            <SpecialToast
                visible={mode === 'add_node'}
                message="Tap to place"
                icon={<MapPin className="w-4 h-4"/>}
            />

            <div
                className="glass-pill p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/10 flex justify-between items-center w-full bg-black/60 backdrop-blur-3xl rounded-[2rem]">
                <Button variant="ghost"
                        className={`rounded-full flex-1 flex flex-col items-center justify-center gap-1 h-16 ${mode === 'view' && !isLocked ? 'bg-amber-600/20 text-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.3)]' : mode === 'view' && isLocked ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        onClick={() => {
                            if (mode !== 'view') {
                                setMode('view');
                                setEdgeStartNode(null);
                            } else {
                                const nextLocked = !isLocked;
                                setIsLocked(nextLocked);
                                if (nextLocked) {
                                    setSelectedNode(null);
                                    setSelectedEdge(null);
                                }
                            }
                        }}>
                    {mode === 'view' && !isLocked ? <Unlock className="w-5 h-5"/> : <Lock className="w-5 h-5"/>}
                    <span className="text-[10px] font-bold">{mode === 'view' && !isLocked ? 'Editing' : 'Locked'}</span>
                </Button>
                <Button variant="ghost"
                        className={`rounded-full flex-1 flex flex-col items-center justify-center gap-1 h-16 ${mode === 'add_node' ? 'bg-emerald-600/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        onClick={() => {
                            setMode('add_node');
                            setEdgeStartNode(null);
                        }}>
                    <MapPin className="w-5 h-5"/> <span className="text-[10px] font-bold">Add Node</span>
                </Button>

                <div className="px-1 flex items-center justify-center">
                    {(() => {
                        const buttonConfig = {
                            idle: {
                                color: 'bg-emerald-600/40 border-emerald-400/20 text-emerald-200 shadow-none hover:bg-emerald-600/50',
                                icon: Save,
                                label: 'Saved',
                                spin: false
                            },
                            unsaved: {
                                color: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]',
                                icon: Save,
                                label: 'Save',
                                spin: false
                            },
                            saving: {
                                color: 'bg-amber-500 border-amber-400/50 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]',
                                icon: Loader2,
                                label: 'Saving',
                                spin: true
                            },
                            saved: {
                                color: 'bg-green-500 border-green-400/50 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]',
                                icon: Check,
                                label: 'Saved',
                                spin: false
                            },
                            error: {
                                color: 'bg-red-600 hover:bg-red-500 border-red-400/50 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]',
                                icon: AlertCircle,
                                label: 'Retry',
                                spin: false
                            },
                            offline: {
                                color: 'bg-slate-600 border-slate-400/50 text-white shadow-[0_0_20px_rgba(71,85,105,0.3)]',
                                icon: WifiOff,
                                label: 'No Net',
                                spin: false
                            }
                        }[syncState];
                        const Icon = buttonConfig.icon;

                        return (
                            <Button
                                onClick={saveGraph}
                                disabled={syncState === 'saving' || syncState === 'idle' || syncState === 'saved'}
                                className={`rounded-full h-16 w-16 p-0 border-2 flex flex-col items-center justify-center gap-1 shrink-0 transition-transform hover:scale-105 active:scale-95 ${buttonConfig.color}`}
                            >
                                <Icon className={`w-6 h-6 ${buttonConfig.spin ? 'animate-spin' : ''}`}/>
                                <span
                                    className="text-[10px] uppercase font-black leading-none">{buttonConfig.label}</span>
                            </Button>
                        );
                    })()}
                </div>

                <SponsorManager data={data} setData={setData}/>

                <Button variant="ghost"
                        className={`rounded-full flex-1 flex flex-col items-center justify-center gap-1 h-16 ${mode === 'test_route' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        onClick={() => {
                            setMode('test_route');
                            setEdgeStartNode(null);
                            setTestRoutePath(null);
                            toast.info('Select a start node');
                        }}>
                    <ArrowRight className="w-5 h-5"/> <span className="text-[10px] font-bold">Route</span>
                </Button>
            </div>
        </div>
    );
}

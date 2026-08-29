import {useState} from 'react';
import {Camera, CircleSmall, DoorClosed, Gem, HeartHandshake, MapPin, Route, Trash2, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Switch} from '@wayontop/ui/components/ui/switch';
import {BaseModal} from '@wayontop/ui/components/BaseModal';
import {NodeWizard} from './NodeWizard';

interface EditorPanelsProps {
    mode: string;
    selectedNode: any;
    setSelectedNode: (node: any) => void;
    selectedEdge: any;
    setSelectedEdge: (edge: any) => void;
    deleteNode: (id: number) => void;
    deleteEdge: (from: number, to: number) => void;
    updateEdge: (from: number, to: number, updates: any) => void;
    updateNode: (id: number, updates: any) => void;
    isLocked: boolean;
    setTestingStamp: (node: any) => void;
    testRoutePath?: { path: any[]; totalDistance: number } | null;
    setTestRoutePath?: (path: any) => void;
    events: import('@wayontop/ui/lib/types').MapEvent[];
    selectedTrace?: any;
    setSelectedTrace?: (val: any) => void;
    deleteTrace?: (index: number) => void;
    categories: import('@wayontop/ui/lib/types').NodeCategory[];
}

export function EditorPanels({
                                 mode, selectedNode, setSelectedNode, selectedEdge, setSelectedEdge,
                                 deleteNode, deleteEdge, updateEdge, updateNode, isLocked,
                                 setTestingStamp, testRoutePath, setTestRoutePath, events,
                                 selectedTrace, setSelectedTrace, deleteTrace, categories
                             }: Readonly<EditorPanelsProps>) {
    const [tagInput, setTagInput] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const isUnnamedTrack = selectedNode?.category?.base_type === 'track' && (!selectedNode.name?.en || selectedNode.name.en.trim() === '' || selectedNode.name.en.startsWith('Node '));
    const showNodePanel = selectedNode && mode === 'view' && !(isLocked && isUnnamedTrack) && !testRoutePath;

    return (
        <>
            {showNodePanel && (
                <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-[4.5rem] right-[4.5rem] md:left-[5.5rem] md:right-[5.5rem] z-20 transition-all duration-300 flex justify-center">
                    {isLocked ? (
                        <Card className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white flex flex-col rounded-2xl overflow-hidden w-full max-w-sm">
                            <div className="p-2.5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="uppercase text-[9px] font-black text-emerald-400 tracking-widest">{selectedNode.category?.base_type || 'poi'}</span>
                                    </div>
                                    <div className="text-sm font-black tracking-tight">{selectedNode.name?.en || 'Unnamed Node'}</div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <NodeWizard
                            node={selectedNode}
                            updateNode={updateNode}
                            deleteNode={(id) => {
                                deleteNode(id);
                                setSelectedNode(null);
                            }}
                            setTestingStamp={setTestingStamp}
                            events={events}
                            categories={categories}
                            onClose={() => setSelectedNode(null)}
                        />
                    )}
                </div>
            )}

            {selectedEdge && mode === 'view' && !testRoutePath && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-[4.5rem] right-[4.5rem] md:left-[5.5rem] md:right-[5.5rem] z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white flex flex-col rounded-2xl overflow-hidden">

                        {isLocked ? (
                            <div className="p-2.5 flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <div
                                        className="uppercase text-[9px] font-black text-emerald-400 tracking-widest flex items-center">
                                        <Route className="w-3 h-3 mr-1"/> Path Segment
                                    </div>
                                    <div
                                        className="text-xl font-black tracking-tighter text-white drop-shadow-lg leading-none">
                                        {selectedEdge.distance_m}<span
                                        className="text-sm text-emerald-500/80 ml-0.5">m</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)}
                                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 rounded-full shrink-0">
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <CardHeader
                                    className="py-1.5 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                                    <CardTitle
                                        className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                                        <Route className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Path Segment
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)}
                                                className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                            <X className="w-3.5 h-3.5"/>
                                        </Button>
                                        <Button variant="ghost" size="icon"
                                                onClick={() => deleteEdge(selectedEdge.from, selectedEdge.to)}
                                                className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2.5 flex-1 flex flex-col items-center justify-center gap-1.5">
                                    <div
                                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance
                                    </div>
                                    <div
                                        className="text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-lg leading-none">
                                        {selectedEdge.distance_m}<span
                                        className="text-xl text-emerald-500/50 ml-0.5">m</span>
                                    </div>
                                    <div
                                        className="flex items-center w-full justify-between bg-black/40 border border-white/10 h-8 rounded-md px-2.5 mt-2">
                                        <span
                                            className="text-[10px] font-bold text-slate-300">HIDDEN (ROUTING ONLY)</span>
                                        <Switch className="scale-[0.65] origin-right"
                                                checked={!!selectedEdge.is_hidden}
                                                onCheckedChange={(checked: boolean) => updateEdge(selectedEdge.from, selectedEdge.to, {is_hidden: checked})}/>
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>
            )}

            {selectedTrace && mode === 'view' && !testRoutePath && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-[4.5rem] right-[4.5rem] md:left-[5.5rem] md:right-[5.5rem] z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white flex flex-col rounded-2xl overflow-hidden">

                        {isLocked ? (
                            <div className="p-2.5 flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <div
                                        className="uppercase text-[9px] font-black text-red-400 tracking-widest flex items-center">
                                        <Route className="w-3 h-3 mr-1"/> GPS Trace
                                    </div>
                                    <div
                                        className="text-xl font-black tracking-tighter text-white drop-shadow-lg leading-none">
                                        {selectedTrace.distance_m}<span
                                        className="text-sm text-red-500/80 ml-0.5">m</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedTrace?.(null)}
                                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 rounded-full shrink-0">
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <CardHeader
                                    className="py-1.5 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                                    <CardTitle
                                        className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                                        <Route className="w-3.5 h-3.5 mr-1.5 text-red-400"/> GPS Trace
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedTrace?.(null)}
                                                className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                            <X className="w-3.5 h-3.5"/>
                                        </Button>
                                        <Button variant="ghost" size="icon"
                                                onClick={() => deleteTrace?.(selectedTrace.index)}
                                                className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2.5 flex-1 flex flex-col items-center justify-center gap-1.5">
                                    <div
                                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance
                                    </div>
                                    <div
                                        className="text-4xl font-black text-red-400 tracking-tighter drop-shadow-lg leading-none">
                                        {selectedTrace.distance_m}<span
                                        className="text-xl text-red-500/50 ml-0.5">m</span>
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>
            )}

            {testRoutePath && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-[4.5rem] right-[4.5rem] md:left-[5.5rem] md:right-[5.5rem] z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white flex flex-col rounded-2xl overflow-hidden">

                        <div className="p-2.5 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5 max-w-[80%]">
                                <div
                                    className="uppercase text-[9px] font-black text-emerald-400 tracking-widest flex items-center">
                                    <Route className="w-3 h-3 mr-1"/> Route Found
                                </div>
                                <div
                                    className="text-sm font-black tracking-tight text-white drop-shadow-lg leading-tight flex flex-col sm:flex-row sm:items-center gap-y-0.5 sm:gap-y-0">
                                    <div className="truncate flex items-baseline sm:block">
                                        <span
                                            className="text-slate-400 sm:hidden mr-1.5 shrink-0 text-[10px] uppercase font-bold">from:</span>
                                        {testRoutePath.path[0].name || testRoutePath.path[0].id}
                                    </div>
                                    <div className="text-slate-400 hidden sm:block mx-1.5 shrink-0">→</div>
                                    <div className="truncate flex items-baseline sm:block">
                                        <span
                                            className="text-slate-400 sm:hidden mr-1.5 shrink-0 text-[10px] uppercase font-bold w-[26px]">to:</span>
                                        {testRoutePath.path[testRoutePath.path.length - 1].name || testRoutePath.path[testRoutePath.path.length - 1].id}
                                    </div>
                                </div>
                                <div className="text-xl font-black text-emerald-400 mt-0.5">
                                    {Math.round(testRoutePath.totalDistance)}<span
                                    className="text-sm text-emerald-500/80 ml-0.5">m</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setTestRoutePath?.(null)}
                                    className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 rounded-full shrink-0">
                                <X className="w-4 h-4"/>
                            </Button>
                        </div>
                    </Card>
                </div>
            )}


        </>
    );
}

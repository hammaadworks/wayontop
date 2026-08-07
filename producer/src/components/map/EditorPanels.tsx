import {useState} from 'react';
import {Camera, CircleSmall, DoorClosed, Gem, HeartHandshake, MapPin, Route, Trash2, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Switch} from '@wayontop/ui/components/ui/switch';
import {BaseModal} from '@wayontop/ui/components/BaseModal';

interface EditorPanelsProps {
    mode: string;
    selectedNode: any;
    setSelectedNode: (node: any) => void;
    selectedEdge: any;
    setSelectedEdge: (edge: any) => void;
    deleteNode: (id: string) => void;
    deleteEdge: (from: string, to: string) => void;
    updateNode: (id: string, updates: any) => void;
    isLocked: boolean;
    setTestingStamp: (node: any) => void;
    testRoutePath?: { path: any[]; totalDistance: number } | null;
    setTestRoutePath?: (path: any) => void;
    availableTags?: string[];
    selectedTrace?: any;
    setSelectedTrace?: (val: any) => void;
    deleteTrace?: (index: number) => void;
}

export function EditorPanels({
                                 mode, selectedNode, selectedEdge, setSelectedEdge,
                                 deleteNode, deleteEdge, updateNode, isLocked,
                                 setTestingStamp, testRoutePath, setTestRoutePath, availableTags,
                                 selectedTrace, setSelectedTrace, deleteTrace
                             }: Readonly<EditorPanelsProps>) {
    const [tagInput, setTagInput] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const isUnnamedTrack = selectedNode?.type === 'track' && (!selectedNode.name || selectedNode.name.trim() === '' || selectedNode.name.startsWith('Node '));
    const showNodePanel = selectedNode && mode === 'view' && !(isLocked && isUnnamedTrack) && !testRoutePath;

    return (
        <>
            {showNodePanel && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-[4.5rem] right-[4.5rem] md:left-[5.5rem] md:right-[5.5rem] z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white flex flex-col rounded-2xl overflow-hidden">

                        {isLocked ? (
                            <div className="p-2.5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span
                                            className="uppercase text-[9px] font-black text-emerald-400 tracking-widest">{selectedNode.type}</span>
                                        {selectedNode.has_stamp && <Gem className="w-3 h-3 text-fuchsia-400 ml-1"/>}
                                    </div>
                                    <div
                                        className="text-sm font-black tracking-tight">{selectedNode.name || 'Unnamed Node'}</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <CardHeader
                                    className="py-1.5 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                                    <CardTitle
                                        className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Edit Node
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon"
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                                className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </Button>
                                        <BaseModal
                                            open={isDeleteDialogOpen}
                                            onOpenChange={setIsDeleteDialogOpen}
                                            title="Delete Node"
                                            description={
                                                <>
                                                    Are you sure you want to delete the node
                                                    "{selectedNode.name || 'Unnamed Node'}"? This action cannot be
                                                    undone.
                                                </>
                                            }
                                            onConfirm={() => {
                                                deleteNode(selectedNode.id);
                                                setIsDeleteDialogOpen(false);
                                            }}
                                            onCancel={() => setIsDeleteDialogOpen(false)}
                                            confirmText="Delete"
                                            cancelText="Cancel"
                                            confirmClassName="bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2 flex-1 flex flex-col gap-1.5 justify-center">
                                    <Input value={selectedNode.name || ''}
                                           onChange={e => updateNode(selectedNode.id, {name: e.target.value})}
                                           placeholder="Node Name..."
                                           className="h-7 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors placeholder:text-slate-500 shadow-inner px-2.5"/>

                                    <div className="flex bg-black/40 rounded-md p-0.5 border border-white/10">
                                        {['poi', 'facility', 'stamp', 'gate', 'track'].map(t => {
                                            const icons: Record<string, any> = {
                                                poi: MapPin,
                                                facility: HeartHandshake,
                                                stamp: Gem,
                                                gate: DoorClosed,
                                                track: CircleSmall
                                            };
                                            const activeClasses: Record<string, string> = {
                                                poi: 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30',
                                                stamp: 'bg-fuchsia-500/20 text-fuchsia-400 shadow-sm border border-fuchsia-500/30',
                                                gate: 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30',
                                                facility: 'bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30',
                                                track: 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30'
                                            };
                                            const Icon = icons[t];
                                            const isActive = selectedNode.type === t;
                                            const styles = isActive ? activeClasses[t] : 'text-slate-400 hover:bg-white/5 hover:text-white';

                                            return (
                                                <button key={t}
                                                        onClick={() => updateNode(selectedNode.id, {type: t as any})}
                                                        title={t.toUpperCase()}
                                                        className={"flex-1 flex justify-center items-center h-6 rounded-sm transition-all " + styles}>
                                                    <Icon className="w-3.5 h-3.5"/>
                                                </button>
                                            )
                                        })}
                                    </div>


                                    {selectedNode.type === 'poi' && (
                                        <div
                                            className="flex items-center justify-between bg-black/40 border border-white/10 h-7 rounded-md px-2.5">
                                            <span
                                                className="text-[10px] font-bold text-slate-300">CONTAINS STAMP?</span>
                                            <Switch className="scale-[0.65] origin-right"
                                                    checked={!!selectedNode.has_stamp}
                                                    onCheckedChange={(checked: boolean) => updateNode(selectedNode.id, {has_stamp: checked})}/>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2 mt-2">
                                        <span className="text-[10px] font-bold text-slate-300">TAGS</span>
                                        <div className="flex flex-wrap gap-1">
                                            {(selectedNode.tags || []).map((t: string) => (
                                                <div key={t}
                                                     className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-sm text-[10px] font-bold">
                                                    {t}
                                                    <button className="hover:text-white"
                                                            onClick={() => updateNode(selectedNode.id, {tags: (selectedNode.tags || []).filter((tag: string) => tag !== t)})}>
                                                        <X className="w-3 h-3"/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <Input
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                placeholder="Search or add tag..."
                                                className="h-7 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors placeholder:text-slate-500 shadow-inner px-2.5"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newTag = tagInput.trim();
                                                        if (newTag) {
                                                            const currentTags = selectedNode.tags || [];
                                                            if (!currentTags.includes(newTag)) {
                                                                updateNode(selectedNode.id, {tags: [...currentTags, newTag]});
                                                            }
                                                            setTagInput('');
                                                        }
                                                    }
                                                }}
                                            />
                                            {availableTags && availableTags.length > 0 && (
                                                <div
                                                    className="flex w-full max-w-full overflow-x-auto gap-1.5 pb-1 mt-1 snap-x touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                    {availableTags
                                                        .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !(selectedNode.tags || []).includes(t))
                                                        .map(t => (
                                                            <button
                                                                key={t}
                                                                onClick={() => {
                                                                    updateNode(selectedNode.id, {tags: [...(selectedNode.tags || []), t]});
                                                                    setTagInput('');
                                                                }}
                                                                className="snap-start shrink-0 flex items-center bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/10 transition-colors"
                                                            >
                                                                + {t}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {(selectedNode.type === 'stamp' || selectedNode.has_stamp) && (
                                        <Button
                                            className="w-full bg-linear-to-r from-pink-500 to-emerald-500 text-white text-[11px] font-black tracking-widest h-7 border-0 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-md"
                                            onClick={() => setTestingStamp(selectedNode)}>
                                            <Camera className="w-3.5 h-3.5 mr-1.5"/> TEST AR DROP
                                        </Button>
                                    )}
                                </CardContent>
                            </>
                        )}
                    </Card>
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

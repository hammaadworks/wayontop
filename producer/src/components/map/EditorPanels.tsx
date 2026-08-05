import {Camera, DoorOpen, GitBranch, Layers, MapPin, Route, Star, Trash2, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@wayontop/ui/components/ui/select';
import {Switch} from '@wayontop/ui/components/ui/switch';

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
}

export function EditorPanels({
                                 mode, selectedNode, setSelectedNode, selectedEdge, setSelectedEdge,
                                 deleteNode, deleteEdge, updateNode, isLocked,
                                 setTestingStamp, testRoutePath, setTestRoutePath
                             }: Readonly<EditorPanelsProps>) {
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
                                        {selectedNode.subtype && <span
                                            className="uppercase text-[9px] font-bold text-slate-400 border border-slate-700 px-1 rounded-sm">{selectedNode.subtype}</span>}
                                        {selectedNode.has_stamp && <Star className="w-3 h-3 text-fuchsia-400 ml-1"/>}
                                    </div>
                                    <div
                                        className="text-sm font-black tracking-tight">{selectedNode.name || 'Unnamed Node'}</div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}
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
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Edit Node
                                    </CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}
                                                className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                            <X className="w-3.5 h-3.5"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)}
                                                className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2 flex-1 flex flex-col gap-1.5 justify-center">
                                    {selectedNode.type !== 'track' && (
                                        <Input value={selectedNode.name || ''}
                                               onChange={e => updateNode(selectedNode.id, {name: e.target.value})}
                                               placeholder="Node Name..."
                                               className="h-7 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors placeholder:text-slate-500 shadow-inner px-2.5"/>
                                    )}

                                    <div className="flex bg-black/40 rounded-md p-0.5 border border-white/10">
                                        {['poi', 'stamp', 'gate', 'facility', 'track'].map(t => {
                                            const icons: Record<string, any> = {
                                                poi: MapPin,
                                                stamp: Star,
                                                gate: DoorOpen,
                                                facility: Layers,
                                                track: GitBranch
                                            };
                                            const activeClasses: Record<string, string> = {
                                                poi: 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30',
                                                stamp: 'bg-fuchsia-500/20 text-fuchsia-400 shadow-sm border border-fuchsia-500/30',
                                                gate: 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30',
                                                facility: 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30',
                                                track: 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/30'
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

                                    {selectedNode.type === 'facility' && (
                                        <Select value={selectedNode.subtype || ''}
                                                onValueChange={(val) => updateNode(selectedNode.id, {subtype: val || undefined})}>
                                            <SelectTrigger
                                                className="bg-black/40 border-white/10 text-white h-7 text-[11px] font-bold px-2.5">
                                                <SelectValue placeholder="Select Facility Type..."/>
                                            </SelectTrigger>
                                            <SelectContent
                                                className="bg-[#09090b] backdrop-blur-2xl border-white/20 text-white z-50">
                                                <SelectItem value="washroom">Washroom</SelectItem>
                                                <SelectItem value="drinking_water">Drinking Water</SelectItem>
                                                <SelectItem value="food">Food</SelectItem>
                                                <SelectItem value="first_aid">First Aid</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
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
                                    className="text-sm font-black tracking-tight text-white drop-shadow-lg leading-tight truncate">
                                    {testRoutePath.path[0].name || testRoutePath.path[0].id} <span
                                    className="text-slate-400 mx-1">→</span> {testRoutePath.path[testRoutePath.path.length - 1].name || testRoutePath.path[testRoutePath.path.length - 1].id}
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

import {Camera, DoorOpen, GitBranch, Layers, MapPin, Route, Star, Trash2, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@wayontop/ui/components/ui/select';
import {Switch} from '@wayontop/ui/components/ui/switch';

interface EditorPanelsProps {
    mode: string;
    setMode: (mode: any) => void;
    selectedNode: any;
    setSelectedNode: (node: any) => void;
    selectedEdge: any;
    setSelectedEdge: (edge: any) => void;
    deleteNode: (id: string) => void;
    deleteEdge: (from: string, to: string) => void;
    updateNode: (id: string, updates: any) => void;
    isLocked: boolean;
    newNodeName: string;
    setNewNodeName: (name: string) => void;
    newNodeType: any;
    setNewNodeType: (type: any) => void;
    setTestingStamp: (node: any) => void;
}

export function EditorPanels({
                                 mode, setMode, selectedNode, setSelectedNode, selectedEdge, setSelectedEdge,
                                 deleteNode, deleteEdge, updateNode, isLocked, newNodeName, setNewNodeName,
                                 newNodeType, setNewNodeType, setTestingStamp
                             }: Readonly<EditorPanelsProps>) {
    return (
        <>
            {selectedNode && mode === 'view' && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-1/2 -translate-x-1/2 w-[calc(100vw-152px)] max-w-100 z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white h-37 flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader
                            className="py-2 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                            <CardTitle
                                className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Edit Node
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}
                                        className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                    <X className="w-3.5 h-3.5"/>
                                </Button>
                                {!isLocked && (
                                    <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)}
                                            className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                                        <Trash2 className="w-3.5 h-3.5"/>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-2.5 flex-1 flex flex-col gap-1.5 justify-center">
                            {selectedNode.type !== 'track' && (
                                <Input value={selectedNode.name || ''}
                                       onChange={e => updateNode(selectedNode.id, {name: e.target.value})}
                                       disabled={isLocked}
                                       placeholder="Node Name..."
                                       className="h-7 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors placeholder:text-slate-500 shadow-inner px-2.5 disabled:opacity-50"/>
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
                                                onClick={() => !isLocked && updateNode(selectedNode.id, {type: t as any})}
                                                disabled={isLocked} title={t.toUpperCase()}
                                                className={"flex-1 flex justify-center items-center h-7 rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed " + styles}>
                                            <Icon className="w-3.5 h-3.5"/>
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedNode.type === 'facility' && (
                                <Select value={selectedNode.subtype || ''} disabled={isLocked}
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
                                    <span className="text-[10px] font-bold text-slate-300">CONTAINS STAMP?</span>
                                    <Switch className="scale-[0.65] origin-right" checked={!!selectedNode.has_stamp}
                                            disabled={isLocked}
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
                    </Card>
                </div>
            )}

            {selectedEdge && mode === 'view' && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-1/2 -translate-x-1/2 w-[calc(100vw-152px)] max-w-100 z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white h-37 flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader
                            className="py-2 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                            <CardTitle
                                className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                                <Route className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Path Segment
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)}
                                        className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                    <X className="w-3.5 h-3.5"/>
                                </Button>
                                {!isLocked && (
                                    <Button variant="ghost" size="icon"
                                            onClick={() => deleteEdge(selectedEdge.from, selectedEdge.to)}
                                            className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                                        <Trash2 className="w-3.5 h-3.5"/>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 flex-1 flex flex-col items-center justify-center gap-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance
                            </div>
                            <div
                                className="text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-lg leading-none">
                                {selectedEdge.distance_m}<span className="text-xl text-emerald-500/50 ml-0.5">m</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {mode === 'add_node' && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-1/2 -translate-x-1/2 w-[calc(100vw-152px)] max-w-100 z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-emerald-500/30 bg-[#09090b]/90 backdrop-blur-3xl text-white h-37 flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader
                            className="py-2 px-3 flex flex-row items-center justify-between border-b border-emerald-500/20 shrink-0 bg-emerald-500/10">
                            <div className="flex items-center gap-2">
                                <CardTitle
                                    className="text-xs font-black text-emerald-400 tracking-tight drop-shadow-sm">New
                                    Node</CardTitle>
                                <span
                                    className="text-[9px] font-bold text-slate-400 uppercase border border-white/10 px-1.5 py-0.5 rounded bg-black/40 shadow-inner hidden sm:inline">Tap map</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setMode('view')}
                                    className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                <X className="w-3.5 h-3.5"/>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-2.5 flex-1 flex flex-col gap-2 justify-center">
                            <Input value={newNodeName} onChange={e => setNewNodeName(e.target.value)}
                                   placeholder="Node Name (Optional)"
                                   className="h-8 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors shadow-inner px-2.5"/>

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
                                    const isActive = newNodeType === t;
                                    const styles = isActive ? activeClasses[t] : 'text-slate-400 hover:bg-white/5 hover:text-white';

                                    return (
                                        <button key={t} onClick={() => setNewNodeType(t as any)} title={t.toUpperCase()}
                                                className={"flex-1 flex justify-center items-center h-8 rounded-sm transition-all " + styles}>
                                            <Icon className="w-4 h-4"/>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}

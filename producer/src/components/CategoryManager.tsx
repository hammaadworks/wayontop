import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Loader2, Plus, Pencil, Trash2, X, Tags} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Label} from '@wayontop/ui/components/ui/label';
import {ScrollArea} from '@wayontop/ui/components/ui/scroll-area';
import {toast} from 'sonner';
import type {GraphData, NodeCategory, NodeBaseType} from '@wayontop/ui/lib/types';
import {supabase} from '@wayontop/ui/lib/supabase';

interface CategoryManagerProps {
    data: GraphData;
    setData: React.Dispatch<React.SetStateAction<GraphData>>;
}

const DEFAULT_CATEGORY: Partial<NodeCategory> = {
    code: '',
    base_type: 'poi',
    icon_key: 'MapPin',
    color_theme: 'cyan',
    name: {en: '', kn: '', hi: ''},
    synonyms: {en: [], kn: [], hi: []}
};

export function CategoryManager({data, setData}: Readonly<CategoryManagerProps>) {
    const [isOpen, setIsOpen] = useState(false);
    
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [categoryForm, setCategoryForm] = useState<Partial<NodeCategory>>(DEFAULT_CATEGORY);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lang, setLang] = useState<'en' | 'kn' | 'hi'>('en');
    
    const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean; id: number; name: string} | null>(null);

    const handleSaveCategory = async () => {
        if (!categoryForm.code || !categoryForm.name?.en) {
            toast.error('Code and English Name are required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                code: categoryForm.code,
                base_type: categoryForm.base_type,
                name: categoryForm.name,
                synonyms: categoryForm.synonyms,
                description: categoryForm.description || null,
                image_url: categoryForm.image_url || null,
                icon_key: categoryForm.icon_key,
                color_theme: categoryForm.color_theme
            };

            if (editingCategoryId) {
                const {error} = await supabase.from('node_categories').update(payload).eq('id', editingCategoryId);
                if (error) throw error;
                
                setData(prev => ({
                    ...prev,
                    categories: prev.categories.map(c => c.id === editingCategoryId ? {...c, ...payload} as NodeCategory : c)
                }));
                toast.success('Category updated successfully');
            } else {
                const {data: newCat, error} = await supabase.from('node_categories').insert([payload]).select().single();
                if (error) throw error;
                
                setData(prev => ({
                    ...prev,
                    categories: [...prev.categories, newCat as NodeCategory]
                }));
                toast.success('Category created successfully');
            }
            setShowForm(false);
            setEditingCategoryId(null);
            setCategoryForm(DEFAULT_CATEGORY);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save category');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const {error} = await supabase.from('node_categories').delete().eq('id', deleteConfirm.id);
            if (error) {
                if (error.code === '23503') throw new Error('Cannot delete category because it is used by existing nodes on the map.');
                throw error;
            }
            
            setData(prev => ({
                ...prev,
                categories: prev.categories.filter(c => c.id !== deleteConfirm.id)
            }));
            toast.success('Category deleted');
            setDeleteConfirm(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete category');
            setDeleteConfirm(null);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                className={`rounded-[1.5rem] w-full flex flex-col items-center justify-center gap-1 h-16 ${isOpen ? 'bg-fuchsia-600/20 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-white hover:text-white hover:bg-white/10'}`}
                onClick={() => setIsOpen(true)}
            >
                <Tags className="w-5 h-5"/>
                <span className="text-[10px] font-bold">Categories</span>
            </Button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#09090b] border-white/10 shadow-2xl overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-4 px-6 shrink-0 bg-white/5">
                            <CardTitle className="text-xl font-bold flex items-center text-white">
                                <Tags className="w-5 h-5 mr-2 text-fuchsia-400"/> Category Manager
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white rounded-full">
                                <X className="w-5 h-5"/>
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-black/20">
                            {!showForm ? (
                                <div className="p-6 flex-1 flex flex-col min-h-0">
                                    <div className="flex justify-end mb-4">
                                        <Button className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white" onClick={() => {
                                            setCategoryForm(DEFAULT_CATEGORY);
                                            setEditingCategoryId(null);
                                            setShowForm(true);
                                        }}>
                                            <Plus className="w-4 h-4 mr-2"/> Add Category
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-1 pr-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {data.categories.map(cat => (
                                                <div key={cat.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-emerald-400">{cat.name?.en || cat.code}</h3>
                                                        <div className="text-xs text-slate-400 space-y-1 mt-1">
                                                            <p>Type: <span className="text-white">{cat.base_type}</span></p>
                                                            <p>Code: <span className="text-white">{cat.code}</span></p>
                                                            <p>Icon: <span className="text-white">{cat.icon_key}</span> ({cat.color_theme})</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white"
                                                            onClick={() => {
                                                                setCategoryForm(cat);
                                                                setEditingCategoryId(cat.id);
                                                                setShowForm(true);
                                                            }}>
                                                            <Pencil className="w-4 h-4"/>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                                            onClick={() => setDeleteConfirm({isOpen: true, id: cat.id, name: cat.name?.en || cat.code})}>
                                                            <Trash2 className="w-4 h-4"/>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {data.categories.length === 0 && (
                                                <div className="col-span-full py-12 text-center text-slate-500">
                                                    No categories found. Create one to get started.
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto min-h-0 p-6">
                                    <div className="max-w-2xl mx-auto space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Category Code</Label>
                                                <Input value={categoryForm.code || ''} onChange={e => setCategoryForm(s => ({...s, code: e.target.value}))} placeholder="e.g. washroom" className="bg-black/50 border-white/10 text-white"/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Base Type</Label>
                                                <select
                                                    value={categoryForm.base_type || 'poi'}
                                                    onChange={e => setCategoryForm(s => ({...s, base_type: e.target.value as NodeBaseType}))}
                                                    className="w-full h-10 rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                                                >
                                                    <option value="poi">POI</option>
                                                    <option value="gate">Gate</option>
                                                    <option value="utility_major">Utility Major</option>
                                                    <option value="utility_minor">Utility Minor</option>
                                                    <option value="stamp">Stamp</option>
                                                    <option value="intersection">Intersection</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-slate-300">Name</Label>
                                                    <div className="flex bg-black/40 rounded-md p-1 border border-white/10 w-fit">
                                                        {(['en', 'kn', 'hi'] as const).map(l => (
                                                            <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-0.5 text-[10px] font-bold rounded-sm uppercase ${lang === l ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-slate-400 hover:text-white'}`}>
                                                                {l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Input 
                                                    value={categoryForm.name?.[lang] || ''} 
                                                    onChange={e => setCategoryForm(s => ({...s, name: {...(s.name as any), [lang]: e.target.value}}))} 
                                                    placeholder={`Category name in ${lang.toUpperCase()}...`}
                                                    className="bg-black/50 border-white/10 text-white"
                                                />
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-slate-300">Description (Optional)</Label>
                                                <textarea
                                                    value={categoryForm.description?.[lang] || ''} 
                                                    onChange={e => setCategoryForm(s => ({...s, description: {...(s.description || {en:'',kn:'',hi:''}), [lang]: e.target.value}}))} 
                                                    placeholder={`Category description in ${lang.toUpperCase()}...`}
                                                    className="w-full h-16 rounded-md bg-black/50 border border-white/10 text-white px-3 py-2 text-sm resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-slate-300">Synonyms (Comma separated, Optional)</Label>
                                                <Input 
                                                    value={categoryForm.synonyms?.[lang]?.join(', ') || ''} 
                                                    onChange={e => setCategoryForm(s => ({...s, synonyms: {...(s.synonyms || {en:[],kn:[],hi:[]}), [lang]: e.target.value.split(',').map(x => x.trim()).filter(Boolean)}}))} 
                                                    placeholder={`e.g. toilet, restroom in ${lang.toUpperCase()}...`}
                                                    className="bg-black/50 border-white/10 text-white"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2 col-span-2">
                                                <Label className="text-slate-300">Category Image / Icon (Optional)</Label>
                                                {categoryForm.image_url ? (
                                                    <div className="relative group rounded-md overflow-hidden border border-white/10 h-32 w-full max-w-sm">
                                                        <img src={categoryForm.image_url} alt="Category" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button variant="destructive" size="sm" onClick={() => setCategoryForm(s => ({...s, image_url: undefined}))}>
                                                                <Trash2 className="w-4 h-4 mr-2"/> Remove Image
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            value={categoryForm.image_url || ''} 
                                                            onChange={e => setCategoryForm(s => ({...s, image_url: e.target.value}))} 
                                                            placeholder="Paste Image URL or Upload..." 
                                                            className="bg-black/50 border-white/10 text-white flex-1"
                                                        />
                                                        <label className="shrink-0 h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-md flex items-center justify-center cursor-pointer transition-colors border border-white/10">
                                                            <span>UPLOAD</span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                toast.loading('Uploading...', { id: 'img-upload' });
                                                                try {
                                                                    const ext = file.name.split('.').pop();
                                                                    const fileName = `cat_${categoryForm.code || 'new'}_${Date.now()}.${ext}`;
                                                                    const { error } = await supabase.storage.from('assets').upload(fileName, file);
                                                                    if (error) throw error;
                                                                    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
                                                                    setCategoryForm(s => ({...s, image_url: publicUrl}));
                                                                    toast.success('Uploaded successfully', { id: 'img-upload' });
                                                                } catch (err: any) {
                                                                    toast.error('Upload failed: ' + err.message, { id: 'img-upload' });
                                                                }
                                                            }}/>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Icon Key (Lucide)</Label>
                                                <Input value={categoryForm.icon_key || ''} onChange={e => setCategoryForm(s => ({...s, icon_key: e.target.value}))} placeholder="MapPin, Droplet..." className="bg-black/50 border-white/10 text-white"/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Color Theme</Label>
                                                <Input value={categoryForm.color_theme || ''} onChange={e => setCategoryForm(s => ({...s, color_theme: e.target.value}))} placeholder="cyan, amber, emerald..." className="bg-black/50 border-white/10 text-white"/>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-6">
                                            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-300">Cancel</Button>
                                            <Button onClick={handleSaveCategory} disabled={isSaving} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Save Category
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {deleteConfirm && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <Card className="w-full max-w-sm bg-zinc-950 border-white/10 shadow-2xl">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">Delete Category</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-slate-300">Are you sure you want to delete <strong className="text-white">{deleteConfirm.name}</strong>? This action cannot be undone.</p>
                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-slate-300">Cancel</Button>
                                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}

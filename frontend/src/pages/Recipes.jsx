import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import {
    Bot,
    Plus,
    Pencil,
    Trash2,
    Play,
    GripVertical,
    Globe,
    MousePointer,
    FormInput,
    Clock,
    Download,
    Eye,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Copy,
    ExternalLink,
    ListOrdered
} from 'lucide-react';
import { recipeApi } from '../lib/recipeApi';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const STEP_TYPES = [
    { value: 'navigate', label: 'Idi na stranicu', icon: Globe, description: 'Otvori URL u pregledniku' },
    { value: 'fill_input', label: 'Unesi tekst', icon: FormInput, description: 'Ispuni polje za unos' },
    { value: 'click', label: 'Klikni element', icon: MousePointer, description: 'Klikni na gumb ili link' },
    { value: 'wait', label: 'Cekaj', icon: Clock, description: 'Sacekaj da se stranica ucita' },
    { value: 'select_option', label: 'Odaberi opciju', icon: ChevronDown, description: 'Odaberi iz padajuceg izbornika' },
    { value: 'download_pdf', label: 'Preuzmi PDF', icon: Download, description: 'Preuzmi PDF datoteku' },
    { value: 'screenshot', label: 'Screenshot', icon: Eye, description: 'Napravi screenshot za provjeru' },
];

function getStepIcon(type) {
    const found = STEP_TYPES.find(s => s.value === type);
    return found ? found.icon : Globe;
}

function getStepLabel(type) {
    const found = STEP_TYPES.find(s => s.value === type);
    return found ? found.label : type;
}

function StepEditor({ step, index, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
    const [expanded, setExpanded] = useState(true);
    const StepIcon = getStepIcon(step.step_type);

    return (
        <div className={cn(
            "border rounded-lg transition-all duration-200",
            expanded ? "bg-card" : "bg-muted/30"
        )}>
            <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex flex-col gap-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                        disabled={isFirst}
                    >
                        <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                        disabled={isLast}
                    >
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>

                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <StepIcon className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                        <span className="text-sm font-medium">{getStepLabel(step.step_type)}</span>
                        {step.is_optional && (
                            <Badge variant="outline" className="text-xs">Opcionalno</Badge>
                        )}
                    </div>
                    {!expanded && step.description && (
                        <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Tip koraka</Label>
                            <Select
                                value={step.step_type}
                                onValueChange={(v) => onUpdate({ ...step, step_type: v })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STEP_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <span className="flex items-center gap-2">
                                                <t.icon className="h-3.5 w-3.5" />
                                                {t.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Cekanje nakon koraka (sekunde)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="30"
                                className="h-9"
                                value={step.wait_seconds}
                                onChange={(e) => onUpdate({ ...step, wait_seconds: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    {(step.step_type === 'navigate') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">URL adresa</Label>
                            <Input
                                placeholder="https://vendor.com/billing/invoices"
                                className="h-9 font-mono text-sm"
                                value={step.value}
                                onChange={(e) => onUpdate({ ...step, value: e.target.value })}
                            />
                        </div>
                    )}

                    {(step.step_type === 'click') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">CSS selektor elementa</Label>
                            <Input
                                placeholder='npr. button.download-btn, a[href*="invoice"], #download-link'
                                className="h-9 font-mono text-sm"
                                value={step.selector}
                                onChange={(e) => onUpdate({ ...step, selector: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Koristite CSS selektore za odabir elementa na koji treba kliknuti
                            </p>
                        </div>
                    )}

                    {(step.step_type === 'fill_input') && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs">CSS selektor polja</Label>
                                <Input
                                    placeholder='npr. input[name="email"], #username, .login-email'
                                    className="h-9 font-mono text-sm"
                                    value={step.selector}
                                    onChange={(e) => onUpdate({ ...step, selector: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Vrijednost za unos</Label>
                                <Input
                                    placeholder="npr. vas@email.com ili {{email}}"
                                    className="h-9"
                                    value={step.value}
                                    onChange={(e) => onUpdate({ ...step, value: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Koristite {'{{email}}'} ili {'{{password}}'} za dinamicke vrijednosti
                                </p>
                            </div>
                        </>
                    )}

                    {(step.step_type === 'select_option') && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs">CSS selektor dropdown-a</Label>
                                <Input
                                    placeholder='npr. select[name="period"], #invoice-month'
                                    className="h-9 font-mono text-sm"
                                    value={step.selector}
                                    onChange={(e) => onUpdate({ ...step, selector: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Vrijednost opcije</Label>
                                <Input
                                    placeholder='npr. 2025-01 ili {{month}}'
                                    className="h-9"
                                    value={step.value}
                                    onChange={(e) => onUpdate({ ...step, value: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    {(step.step_type === 'wait') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">Cekaj na element (opcionalno)</Label>
                            <Input
                                placeholder='npr. .invoice-table, #download-ready'
                                className="h-9 font-mono text-sm"
                                value={step.selector}
                                onChange={(e) => onUpdate({ ...step, selector: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Ostavite prazno za obicno cekanje ili unesite selektor elementa na koji treba pricekati
                            </p>
                        </div>
                    )}

                    {(step.step_type === 'download_pdf') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">CSS selektor linka za preuzimanje</Label>
                            <Input
                                placeholder='npr. a[href*=".pdf"], .download-invoice-btn'
                                className="h-9 font-mono text-sm"
                                value={step.selector}
                                onChange={(e) => onUpdate({ ...step, selector: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs">Opis koraka</Label>
                        <Input
                            placeholder="Sto ovaj korak radi..."
                            className="h-9"
                            value={step.description}
                            onChange={(e) => onUpdate({ ...step, description: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={step.is_optional}
                            onCheckedChange={(checked) => onUpdate({ ...step, is_optional: checked })}
                        />
                        <Label className="text-xs cursor-pointer">
                            Opcionalni korak (nastavi i ako ne uspije)
                        </Label>
                    </div>
                </div>
            )}
        </div>
    );
}

function RecipeCard({ recipe, onEdit, onDelete, onRun }) {
    return (
        <Card className="bento-card card-hover animate-fade-in">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{recipe.vendor_name}</CardTitle>
                            {recipe.login_url && (
                                <a
                                    href={recipe.login_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {new URL(recipe.login_url).hostname}
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {recipe.is_active ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Aktivan</Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs">Neaktivan</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {recipe.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{recipe.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span>{recipe.step_count || 0} koraka</span>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onEdit(recipe)}
                    >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Uredi
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => onRun(recipe)}
                        disabled={!recipe.is_active || (recipe.step_count || 0) === 0}
                    >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Pokreni
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDelete(recipe)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Recipes() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        vendor_name: '',
        login_url: '',
        description: '',
        credentials_email: '',
        credentials_note: '',
        is_active: true,
    });

    const [steps, setSteps] = useState([]);
    const [runDialogOpen, setRunDialogOpen] = useState(false);
    const [running, setRunning] = useState(false);
    const [runResult, setRunResult] = useState(null);

    const loadRecipes = useCallback(async () => {
        try {
            const response = await recipeApi.getAll();
            setRecipes(response.data || []);
        } catch (err) {
            toast.error('Greska pri ucitavanju recepata');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecipes();
    }, [loadRecipes]);

    const handleAddClick = () => {
        setSelectedRecipe(null);
        setFormData({
            vendor_name: '',
            login_url: '',
            description: '',
            credentials_email: '',
            credentials_note: '',
            is_active: true,
        });
        setSteps([]);
        setDialogOpen(true);
    };

    const handleEditClick = async (recipe) => {
        setSelectedRecipe(recipe);
        setFormData({
            vendor_name: recipe.vendor_name,
            login_url: recipe.login_url || '',
            description: recipe.description || '',
            credentials_email: recipe.credentials_email || '',
            credentials_note: recipe.credentials_note || '',
            is_active: recipe.is_active,
        });

        try {
            const stepsRes = await recipeApi.getSteps(recipe.id);
            setSteps(stepsRes.data || []);
        } catch {
            setSteps([]);
        }

        setDialogOpen(true);
    };

    const handleDeleteClick = (recipe) => {
        setSelectedRecipe(recipe);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRecipe) return;
        try {
            await recipeApi.delete(selectedRecipe.id);
            toast.success('Recept obrisan');
            setDeleteDialogOpen(false);
            await loadRecipes();
        } catch (err) {
            toast.error('Greska pri brisanju');
        }
    };

    const addStep = () => {
        setSteps(prev => [...prev, {
            step_type: 'navigate',
            selector: '',
            value: '',
            description: '',
            wait_seconds: 2,
            is_optional: false,
            step_order: prev.length,
        }]);
    };

    const updateStep = (index, updatedStep) => {
        setSteps(prev => prev.map((s, i) => i === index ? updatedStep : s));
    };

    const removeStep = (index) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
    };

    const moveStep = (index, direction) => {
        const newSteps = [...steps];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newSteps.length) return;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const handleSubmit = async () => {
        if (!formData.vendor_name.trim()) {
            toast.error('Naziv dobavljaca je obavezan');
            return;
        }

        setSaving(true);
        try {
            let recipeId;
            const payload = { ...formData };

            if (selectedRecipe) {
                await recipeApi.update(selectedRecipe.id, payload);
                recipeId = selectedRecipe.id;
            } else {
                const response = await recipeApi.create(payload);
                recipeId = response.data.id;
            }

            const orderedSteps = steps.map((s, i) => ({ ...s, step_order: i }));
            await recipeApi.saveSteps(recipeId, orderedSteps);

            toast.success(selectedRecipe ? 'Recept azuriran' : 'Recept kreiran');
            setDialogOpen(false);
            await loadRecipes();
        } catch (err) {
            toast.error('Greska pri spremanju');
        } finally {
            setSaving(false);
        }
    };

    const handleRunClick = (recipe) => {
        setSelectedRecipe(recipe);
        setRunResult(null);
        setRunDialogOpen(true);
    };

    const handleRun = async () => {
        if (!selectedRecipe) return;
        setRunning(true);
        setRunResult(null);

        try {
            const response = await recipeApi.run(selectedRecipe.id);
            setRunResult(response.data);
            if (response.data.status === 'success') {
                toast.success('Recept uspjesno izvrsenn');
            } else {
                toast.error(response.data.result_message || 'Greska pri izvrsavanju');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || 'Greska pri izvrsavanju recepta';
            setRunResult({ status: 'failed', result_message: msg });
            toast.error(msg);
        } finally {
            setRunning(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            Automatizacija preuzimanja
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Kreirajte recepte za automatsko preuzimanje racuna s web stranica dobavljaca
                        </p>
                    </div>
                    <Button onClick={handleAddClick} data-testid="add-recipe-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Novi recept
                    </Button>
                </div>

                <Card className="bento-card bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium">Kako funkcionira?</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Za dobavljace koji ne salju racune emailom, definirajte korake za preuzimanje s njihove web stranice.
                                    Svaki recept sadrzi niz koraka: navigacija na stranicu, prijava, navigacija do racuna i preuzimanje PDF-a.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {STEP_TYPES.slice(0, 4).map(t => (
                                        <Badge key={t.value} variant="outline" className="text-xs gap-1">
                                            <t.icon className="h-3 w-3" />
                                            {t.label}
                                        </Badge>
                                    ))}
                                    <Badge variant="outline" className="text-xs">+3 vise</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {recipes.length === 0 ? (
                    <Card className="bento-card">
                        <CardContent className="py-12 text-center">
                            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-lg font-medium">Nema recepata</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Kreirajte prvi recept za automatsko preuzimanje racuna
                            </p>
                            <Button className="mt-4" onClick={handleAddClick}>
                                <Plus className="h-4 w-4 mr-2" />
                                Kreiraj recept
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recipes.map((recipe, idx) => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                onRun={handleRunClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            {selectedRecipe ? 'Uredi recept' : 'Novi recept za preuzimanje'}
                        </DialogTitle>
                        <DialogDescription>
                            Definirajte korake za automatsko preuzimanje racuna s web stranice dobavljaca
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Naziv dobavljaca *</Label>
                                <Input
                                    placeholder="npr. name.com, Contabo, Hetzner..."
                                    value={formData.vendor_name}
                                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                    data-testid="recipe-vendor-name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL za prijavu</Label>
                                <Input
                                    placeholder="https://vendor.com/login"
                                    className="font-mono text-sm"
                                    value={formData.login_url}
                                    onChange={(e) => setFormData({ ...formData, login_url: e.target.value })}
                                    data-testid="recipe-login-url"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Opis</Label>
                            <Textarea
                                placeholder="Opisite sto ovaj recept radi..."
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email za prijavu na portal</Label>
                                <Input
                                    placeholder="vas@email.com"
                                    value={formData.credentials_email}
                                    onChange={(e) => setFormData({ ...formData, credentials_email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Napomena o kredencijalima</Label>
                                <Input
                                    placeholder="npr. Koristicka lozinka iz LastPass-a"
                                    value={formData.credentials_note}
                                    onChange={(e) => setFormData({ ...formData, credentials_note: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label className="cursor-pointer">Aktivan recept</Label>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-medium flex items-center gap-2">
                                        <ListOrdered className="h-4 w-4 text-primary" />
                                        Koraci za preuzimanje
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Definirajte redoslijed radnji za preuzimanje racuna
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={addStep}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Dodaj korak
                                </Button>
                            </div>

                            {steps.length === 0 ? (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <ListOrdered className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Nema definiranih koraka</p>
                                    <Button variant="outline" size="sm" className="mt-3" onClick={addStep}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Dodaj prvi korak
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {steps.map((step, index) => (
                                        <StepEditor
                                            key={index}
                                            step={step}
                                            index={index}
                                            onUpdate={(updated) => updateStep(index, updated)}
                                            onRemove={() => removeStep(index)}
                                            onMoveUp={() => moveStep(index, -1)}
                                            onMoveDown={() => moveStep(index, 1)}
                                            isFirst={index === 0}
                                            isLast={index === steps.length - 1}
                                        />
                                    ))}
                                    <Button variant="outline" size="sm" className="w-full" onClick={addStep}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Dodaj korak
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Odustani
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving} data-testid="recipe-submit-btn">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Spremanje...
                                </>
                            ) : (
                                selectedRecipe ? 'Spremi promjene' : 'Kreiraj recept'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Obrisi recept
                        </DialogTitle>
                        <DialogDescription>
                            Jeste li sigurni da zelite obrisati recept za "{selectedRecipe?.vendor_name}"?
                            Ova akcija se ne moze ponistiti.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Odustani
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Obrisi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5 text-primary" />
                            Pokreni recept: {selectedRecipe?.vendor_name}
                        </DialogTitle>
                        <DialogDescription>
                            Automatski ce se izvrsiti svi definirani koraci za preuzimanje racuna
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {!running && !runResult && (
                            <div className="text-center py-6">
                                <Bot className="h-16 w-16 mx-auto text-primary/50 mb-4" />
                                <p className="text-sm text-muted-foreground mb-4">
                                    Kliknite "Pokreni" za automatsko preuzimanje racuna s web stranice
                                </p>
                                <Button onClick={handleRun}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Pokreni automatizaciju
                                </Button>
                            </div>
                        )}

                        {running && (
                            <div className="text-center py-6">
                                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                                <p className="text-sm font-medium">Izvrsavanje recepta...</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Ovo moze potrajati nekoliko sekundi
                                </p>
                            </div>
                        )}

                        {runResult && (
                            <div className={cn(
                                "rounded-lg border p-4",
                                runResult.status === 'success' ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    {runResult.status === 'success' ? (
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-destructive" />
                                    )}
                                    <span className="font-medium">
                                        {runResult.status === 'success' ? 'Uspjesno izvrseno' : 'Greska pri izvrsavanju'}
                                    </span>
                                </div>
                                {runResult.result_message && (
                                    <p className="text-sm text-muted-foreground">{runResult.result_message}</p>
                                )}
                                {runResult.downloaded_files > 0 && (
                                    <p className="text-sm mt-2">
                                        Preuzeto datoteka: <strong>{runResult.downloaded_files}</strong>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
                            Zatvori
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

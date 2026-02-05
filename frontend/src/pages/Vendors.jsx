import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import { 
    Users,
    Plus,
    Pencil,
    Trash2,
    ExternalLink,
    Tag,
    FileText,
    Bot
} from 'lucide-react';
import { vendorApi } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Vendors() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        keywords: '',
        download_url: '',
        instructions: '',
    });

    const loadVendors = useCallback(async () => {
        try {
            const response = await vendorApi.getAll();
            setVendors(response.data);
        } catch (err) {
            toast.error('Greška pri učitavanju dobavljača');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVendors();
    }, [loadVendors]);

    const handleAddClick = () => {
        setSelectedVendor(null);
        setFormData({
            name: '',
            keywords: '',
            download_url: '',
            instructions: '',
        });
        setDialogOpen(true);
    };

    const handleEditClick = (vendor) => {
        setSelectedVendor(vendor);
        setFormData({
            name: vendor.name,
            keywords: vendor.keywords?.join(', ') || '',
            download_url: vendor.download_url || '',
            instructions: vendor.instructions || '',
        });
        setDialogOpen(true);
    };

    const handleDeleteClick = (vendor) => {
        setSelectedVendor(vendor);
        setDeleteDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('Naziv je obavezan');
            return;
        }

        const data = {
            name: formData.name.trim(),
            keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
            download_url: formData.download_url.trim() || null,
            instructions: formData.instructions.trim() || null,
        };

        try {
            if (selectedVendor) {
                await vendorApi.update(selectedVendor.id, data);
                toast.success('Dobavljač ažuriran');
            } else {
                await vendorApi.create(data);
                toast.success('Dobavljač dodan');
            }
            setDialogOpen(false);
            await loadVendors();
        } catch (err) {
            toast.error('Greška pri spremanju');
        }
    };

    const handleDelete = async () => {
        if (!selectedVendor) return;

        try {
            await vendorApi.delete(selectedVendor.id);
            toast.success('Dobavljač obrisan');
            setDeleteDialogOpen(false);
            await loadVendors();
        } catch (err) {
            toast.error('Greška pri brisanju');
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
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            Dobavljači
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Upravljajte dobavljačima i uputama za preuzimanje računa
                        </p>
                    </div>
                    <Button onClick={handleAddClick} data-testid="add-vendor-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj dobavljača
                    </Button>
                </div>

                {/* Info Card */}
                <Card className="bento-card bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium">Kako funkcionira?</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Dodajte dobavljače i definirajte ključne riječi za automatsko prepoznavanje transakcija. 
                                    Možete također dodati upute i linkove za ručno preuzimanje računa.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Vendors Grid */}
                {vendors.length === 0 ? (
                    <Card className="bento-card">
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-lg font-medium">Nema dobavljača</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Dodajte prvog dobavljača za početak
                            </p>
                            <Button className="mt-4" onClick={handleAddClick}>
                                <Plus className="h-4 w-4 mr-2" />
                                Dodaj dobavljača
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vendors.map((vendor, idx) => (
                            <Card 
                                key={vendor.id} 
                                className={cn("bento-card card-hover animate-fade-in", `stagger-${Math.min(idx + 1, 4)}`)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">{vendor.name}</CardTitle>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleEditClick(vendor)}
                                                data-testid={`edit-vendor-${vendor.id}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteClick(vendor)}
                                                data-testid={`delete-vendor-${vendor.id}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {vendor.keywords?.length > 0 && (
                                        <div className="mb-3">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                                <Tag className="h-3 w-3" />
                                                <span>Ključne riječi</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {vendor.keywords.slice(0, 5).map((kw, i) => (
                                                    <span 
                                                        key={i}
                                                        className="px-2 py-0.5 bg-muted rounded text-xs"
                                                    >
                                                        {kw}
                                                    </span>
                                                ))}
                                                {vendor.keywords.length > 5 && (
                                                    <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                                        +{vendor.keywords.length - 5}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {vendor.download_url && (
                                        <a 
                                            href={vendor.download_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm text-primary hover:underline mb-2"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Link za preuzimanje
                                        </a>
                                    )}

                                    {vendor.instructions && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {vendor.instructions}
                                        </p>
                                    )}

                                    {!vendor.keywords?.length && !vendor.download_url && !vendor.instructions && (
                                        <p className="text-sm text-muted-foreground italic">
                                            Nema dodatnih informacija
                                        </p>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-3"
                                        onClick={() => navigate('/recipes')}
                                    >
                                        <Bot className="h-3.5 w-3.5 mr-1.5" />
                                        Automatizacija
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedVendor ? 'Uredi dobavljača' : 'Dodaj dobavljača'}
                        </DialogTitle>
                        <DialogDescription>
                            Definirajte dobavljača i upute za preuzimanje računa
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="vendor-name">Naziv *</Label>
                            <Input
                                id="vendor-name"
                                placeholder="npr. EMERGENT, CONTABO..."
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                data-testid="vendor-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor-keywords">Ključne riječi (odvojene zarezom)</Label>
                            <Input
                                id="vendor-keywords"
                                placeholder="npr. emergent, EMERGENT.SH"
                                value={formData.keywords}
                                onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                                data-testid="vendor-keywords-input"
                            />
                            <p className="text-xs text-muted-foreground">
                                Koriste se za automatsko prepoznavanje transakcija
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor-url">Link za preuzimanje računa</Label>
                            <Input
                                id="vendor-url"
                                placeholder="https://example.com/billing"
                                value={formData.download_url}
                                onChange={(e) => setFormData({...formData, download_url: e.target.value})}
                                data-testid="vendor-url-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor-instructions">Upute za preuzimanje</Label>
                            <Textarea
                                id="vendor-instructions"
                                placeholder="Opišite kako preuzeti račun..."
                                value={formData.instructions}
                                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                                rows={3}
                                data-testid="vendor-instructions-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Odustani
                        </Button>
                        <Button onClick={handleSubmit} data-testid="vendor-submit-btn">
                            {selectedVendor ? 'Spremi' : 'Dodaj'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Obriši dobavljača</DialogTitle>
                        <DialogDescription>
                            Jeste li sigurni da želite obrisati dobavljača "{selectedVendor?.name}"? 
                            Ova akcija se ne može poništiti.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Odustani
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            data-testid="confirm-delete-btn"
                        >
                            Obriši
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

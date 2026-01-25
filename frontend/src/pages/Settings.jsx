import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { 
    Mail, 
    Key, 
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Loader2,
    Search,
    Calendar
} from 'lucide-react';
import { settingsApi, emailApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Settings() {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingSearch, setSavingSearch] = useState(false);
    const [testing, setTesting] = useState(false);
    const [zohoConfig, setZohoConfig] = useState({
        zoho_email: '',
        zoho_app_password: '',
    });
    const [searchSettings, setSearchSettings] = useState({
        date_range_days: 0,
        search_all_fields: true,
    });
    const [isConfigured, setIsConfigured] = useState(false);
    const [connectionTested, setConnectionTested] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [zohoRes, searchRes] = await Promise.all([
                settingsApi.getZoho(),
                settingsApi.getSearch()
            ]);
            setZohoConfig({
                zoho_email: zohoRes.data.zoho_email || '',
                zoho_app_password: '',
            });
            setIsConfigured(zohoRes.data.zoho_configured);
            setSearchSettings({
                date_range_days: searchRes.data.date_range_days || 0,
                search_all_fields: searchRes.data.search_all_fields !== false,
            });
        } catch (err) {
            toast.error('Greška pri učitavanju postavki');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveZoho = async () => {
        if (!zohoConfig.zoho_email) {
            toast.error('Unesite Zoho email');
            return;
        }

        if (!zohoConfig.zoho_app_password && !isConfigured) {
            toast.error('Unesite App Password');
            return;
        }

        setSaving(true);
        try {
            await settingsApi.saveZoho({
                zoho_email: zohoConfig.zoho_email,
                zoho_app_password: zohoConfig.zoho_app_password || 'unchanged',
            });
            toast.success('Zoho postavke spremljene');
            setIsConfigured(true);
            setConnectionTested(false);
            updateUser({ ...user, zoho_configured: true });
        } catch (err) {
            toast.error('Greška pri spremanju');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSearch = async () => {
        setSavingSearch(true);
        try {
            await settingsApi.saveSearch(searchSettings);
            toast.success('Postavke pretrage spremljene');
        } catch (err) {
            toast.error('Greška pri spremanju');
        } finally {
            setSavingSearch(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            const response = await emailApi.testConnection();
            toast.success(response.data.message);
            setConnectionTested(true);
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri povezivanju';
            toast.error(message);
            setConnectionTested(false);
        } finally {
            setTesting(false);
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
            <div className="space-y-6 max-w-2xl">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                        Postavke
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Konfigurirajte email i postavke pretrage
                    </p>
                </div>

                {/* Zoho Configuration */}
                <Card className="bento-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Mail className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Zoho Mail konfiguracija</CardTitle>
                                    <CardDescription>
                                        Povežite svoj Zoho Mail račun za preuzimanje računa
                                    </CardDescription>
                                </div>
                            </div>
                            {isConfigured && (
                                <div className="flex items-center gap-1 text-primary text-sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Konfigurirano</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Instructions */}
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Kako dobiti App Password:</h4>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Prijavite se na <a href="https://accounts.zoho.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">accounts.zoho.com</a></li>
                                <li>Idite na Security → App Passwords</li>
                                <li>Kliknite "Generate New Password"</li>
                                <li>Upišite naziv (npr. "FinZen") i kopirajte generirani password</li>
                            </ol>
                            <a 
                                href="https://help.zoho.com/portal/en/kb/mail/access-from-external-mail-clients/articles/how-do-i-generate-an-app-password"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Detaljne upute
                            </a>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zoho-email">Zoho Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="zoho-email"
                                    type="email"
                                    placeholder="vas@zoho.com"
                                    className="pl-10"
                                    value={zohoConfig.zoho_email}
                                    onChange={(e) => setZohoConfig({...zohoConfig, zoho_email: e.target.value})}
                                    data-testid="zoho-email-input"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zoho-password">
                                App Password {isConfigured && <span className="text-muted-foreground">(ostavite prazno ako ne želite mijenjati)</span>}
                            </Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="zoho-password"
                                    type="password"
                                    placeholder={isConfigured ? "••••••••••••" : "Unesite App Password"}
                                    className="pl-10"
                                    value={zohoConfig.zoho_app_password}
                                    onChange={(e) => setZohoConfig({...zohoConfig, zoho_app_password: e.target.value})}
                                    data-testid="zoho-password-input"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                onClick={handleSaveZoho} 
                                disabled={saving}
                                className="flex-1"
                                data-testid="save-zoho-btn"
                            >
                                {saving ? 'Spremanje...' : 'Spremi Zoho postavke'}
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={handleTestConnection} 
                                disabled={testing || !isConfigured}
                                data-testid="test-connection-btn"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Testiranje...
                                    </>
                                ) : connectionTested ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                                        Povezano
                                    </>
                                ) : (
                                    'Testiraj vezu'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Search Settings */}
                <Card className="bento-card">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Search className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Postavke pretrage</CardTitle>
                                <CardDescription>
                                    Konfigurirajte kako se pretražuju emailovi
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="date-range" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Raspon dana za pretragu
                            </Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="date-range"
                                    type="number"
                                    min="0"
                                    max="30"
                                    className="w-24"
                                    value={searchSettings.date_range_days}
                                    onChange={(e) => setSearchSettings({
                                        ...searchSettings, 
                                        date_range_days: parseInt(e.target.value) || 0
                                    })}
                                    data-testid="date-range-input"
                                />
                                <span className="text-sm text-muted-foreground">
                                    dana prije i poslije datuma transakcije
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                0 = pretraga samo na točan datum, 5 = ±5 dana od datuma transakcije
                            </p>
                        </div>

                        <div className="flex items-center justify-between py-3 border-t">
                            <div className="space-y-1">
                                <Label htmlFor="search-all" className="cursor-pointer">
                                    Pretraži po svim poljima
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Osim primatelja, pretraži i po opisu transakcije i napomeni
                                </p>
                            </div>
                            <Switch
                                id="search-all"
                                checked={searchSettings.search_all_fields}
                                onCheckedChange={(checked) => setSearchSettings({
                                    ...searchSettings,
                                    search_all_fields: checked
                                })}
                                data-testid="search-all-switch"
                            />
                        </div>

                        <Button 
                            onClick={handleSaveSearch} 
                            disabled={savingSearch}
                            className="w-full"
                            data-testid="save-search-btn"
                        >
                            {savingSearch ? 'Spremanje...' : 'Spremi postavke pretrage'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Account Info */}
                <Card className="bento-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Informacije o računu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Ime</span>
                                <span className="font-medium">{user?.name}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Email</span>
                                <span className="font-medium">{user?.email}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-muted-foreground">Zoho status</span>
                                <span className={cn(
                                    "status-pill",
                                    isConfigured ? "status-found" : "status-pending"
                                )}>
                                    {isConfigured ? 'Konfigurirano' : 'Nije konfigurirano'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

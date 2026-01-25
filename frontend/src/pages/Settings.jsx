import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
    Settings as SettingsIcon, 
    Mail, 
    Key, 
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { settingsApi, emailApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Settings() {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [zohoConfig, setZohoConfig] = useState({
        zoho_email: '',
        zoho_app_password: '',
    });
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await settingsApi.getZoho();
            setZohoConfig({
                zoho_email: response.data.zoho_email || '',
                zoho_app_password: '',
            });
            setIsConfigured(response.data.zoho_configured);
        } catch (err) {
            toast.error('Greška pri učitavanju postavki');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
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
            toast.success('Postavke spremljene');
            setIsConfigured(true);
            updateUser({ ...user, zoho_configured: true });
        } catch (err) {
            toast.error('Greška pri spremanju');
        } finally {
            setSaving(false);
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
                        Konfigurirajte pristup vašem email računu
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

                        <div className="flex items-center gap-2 p-3 bg-accent/10 text-accent rounded-md text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>
                                Napomena: Za potpunu email integraciju potrebna je dodatna OAuth konfiguracija na serveru.
                                Trenutno možete koristiti ručno preuzimanje računa putem vendor linkova.
                            </span>
                        </div>

                        <Button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full md:w-auto"
                            data-testid="save-zoho-btn"
                        >
                            {saving ? 'Spremanje...' : 'Spremi postavke'}
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

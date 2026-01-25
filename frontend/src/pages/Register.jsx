import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FileSpreadsheet, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Lozinke se ne podudaraju');
            return;
        }

        if (formData.password.length < 6) {
            setError('Lozinka mora imati najmanje 6 znakova');
            return;
        }

        setLoading(true);

        try {
            await register(formData.email, formData.password, formData.name);
            toast.success('Račun uspješno kreiran!');
            navigate('/dashboard');
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri registraciji';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div 
                className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
                style={{ 
                    backgroundImage: 'url(https://images.unsplash.com/photo-1636837955417-2d8a4e49368f?crop=entropy&cs=srgb&fm=jpg&q=85)',
                }}
            >
                <div className="absolute inset-0 bg-primary/80" />
                <div className="relative z-10 flex flex-col justify-center p-12 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <FileSpreadsheet className="h-12 w-12" />
                        <span className="text-4xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            FinZen
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                        Započnite besplatno
                    </h1>
                    <p className="text-lg text-white/80 max-w-md">
                        Registrirajte se i počnite organizirati svoje račune već danas. 
                        Brzo, jednostavno i sigurno.
                    </p>
                </div>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
                    <CardHeader className="text-center lg:text-left">
                        <div className="flex items-center gap-2 justify-center lg:hidden mb-4">
                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                            <span className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                                FinZen
                            </span>
                        </div>
                        <CardTitle className="text-2xl" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            Kreirajte račun
                        </CardTitle>
                        <CardDescription>
                            Unesite svoje podatke za registraciju
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm animate-fade-in">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Ime</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Vaše ime"
                                        className="pl-10"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        data-testid="register-name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="vas@email.com"
                                        className="pl-10"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        data-testid="register-email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Lozinka</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        data-testid="register-password"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        data-testid="register-confirm-password"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full"
                                disabled={loading}
                                data-testid="register-submit"
                            >
                                {loading ? 'Registracija...' : 'Registriraj se'}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Već imate račun?{' '}
                            <Link 
                                to="/login" 
                                className="text-primary hover:underline font-medium"
                                data-testid="login-link"
                            >
                                Prijavite se
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

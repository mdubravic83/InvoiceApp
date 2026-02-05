import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FileSpreadsheet, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            toast.success('Uspješna prijava!');
            navigate('/dashboard');
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri prijavi';
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
                        Organizirajte svoje račune jednostavno
                    </h1>
                    <p className="text-lg text-white/80 max-w-md">
                        Automatski preuzmite i organizirajte sve svoje poslovne račune iz emaila. 
                        Uštedite vrijeme i smanjite pogreške.
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
                            Dobrodošli natrag
                        </CardTitle>
                        <CardDescription>
                            Prijavite se u svoj račun
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
                                        data-testid="login-email"
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
                                        data-testid="login-password"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full"
                                disabled={loading}
                                data-testid="login-submit"
                            >
                                {loading ? 'Prijava...' : 'Prijava'}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Nemate račun?{' '}
                            <Link 
                                to="/register" 
                                className="text-primary hover:underline font-medium"
                                data-testid="register-link"
                            >
                                Registrirajte se
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

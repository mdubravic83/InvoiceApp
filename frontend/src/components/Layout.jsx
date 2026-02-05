import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    LogOut,
    FileSpreadsheet,
    Moon,
    Sun,
    Bot
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const navigation = [
    { name: 'Nadzorna ploca', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transakcije', href: '/transactions', icon: FileText },
    { name: 'Dobavljaci', href: '/vendors', icon: Users },
    { name: 'Automatizacija', href: '/recipes', icon: Bot },
    { name: 'Postavke', href: '/settings', icon: Settings },
];

export const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
                <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                    <Link to="/dashboard" className="flex items-center gap-2">
                        <FileSpreadsheet className="h-7 w-7 text-primary" />
                        <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            FinZen
                        </span>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={toggleTheme}
                        data-testid="theme-toggle"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                data-testid={`nav-${item.href.replace('/', '')}`}
                                className={cn(
                                    'sidebar-link',
                                    isActive && 'active'
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user?.name || 'Korisnik'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        onClick={handleLogout}
                        data-testid="logout-btn"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Odjava
                    </Button>
                </div>
            </aside>

            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-50">
                <Link to="/dashboard" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <span className="text-lg font-bold">FinZen</span>
                </Link>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <main className="flex-1 overflow-auto">
                <div className="md:hidden h-14" />
                <div className="p-6 md:p-8 max-w-7xl mx-auto pb-20 md:pb-8">
                    {children}
                </div>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
                {navigation.slice(0, 5).map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                'flex flex-col items-center gap-1 px-2 py-1 text-xs',
                                isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name.split(' ')[0]}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, 
    FileText, 
    Users, 
    Settings, 
    LogOut,
    Upload,
    FileSpreadsheet
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const navigation = [
    { name: 'Nadzorna ploča', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transakcije', href: '/transactions', icon: FileText },
    { name: 'Dobavljači', href: '/vendors', icon: Users },
    { name: 'Postavke', href: '/settings', icon: Settings },
];

export const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-border">
                    <Link to="/dashboard" className="flex items-center gap-2">
                        <FileSpreadsheet className="h-7 w-7 text-primary" />
                        <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            FinZen
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
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

                {/* User section */}
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

            {/* Mobile header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-50">
                <Link to="/dashboard" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <span className="text-lg font-bold">FinZen</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="md:hidden h-14" /> {/* Spacer for mobile header */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile bottom navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
                {navigation.slice(0, 4).map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                'flex flex-col items-center gap-1 px-3 py-1 text-xs',
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

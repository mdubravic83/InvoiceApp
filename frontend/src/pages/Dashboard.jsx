import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
    FileText, 
    Upload, 
    AlertTriangle, 
    CheckCircle2, 
    Clock,
    TrendingUp,
    FileSpreadsheet,
    Download,
    ArrowRight
} from 'lucide-react';
import { statsApi, transactionApi } from '../lib/api';
import { toast } from 'sonner';
import { cn, formatAmount } from '../lib/utils';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [batches, setBatches] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, batchesRes, transRes] = await Promise.all([
                statsApi.get(),
                transactionApi.getBatches(),
                transactionApi.getAll(null, 'pending')
            ]);
            setStats(statsRes.data);
            setBatches(batchesRes.data);
            setRecentTransactions(transRes.data.slice(0, 5));
        } catch (err) {
            toast.error('Greška pri učitavanju podataka');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            await handleFileUpload(files[0]);
        }
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (files && files[0]) {
            await handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        if (!file.name.endsWith('.csv')) {
            toast.error('Samo CSV datoteke su dozvoljene');
            return;
        }

        setUploading(true);
        const now = new Date();
        const month = (now.getMonth() + 1).toString();
        const year = now.getFullYear().toString();

        try {
            const response = await transactionApi.uploadCSV(file, month, year);
            toast.success(response.data.message);
            await loadData();
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri uploadu';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    const progressPercentage = stats ? 
        Math.round((stats.downloaded / (stats.total_transactions || 1)) * 100) : 0;

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
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            Nadzorna ploča
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Pregled vaših računa i transakcija
                        </p>
                    </div>
                    <Button 
                        onClick={() => navigate('/transactions')}
                        data-testid="view-all-transactions-btn"
                    >
                        Pogledaj sve transakcije
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                {/* Bento Grid */}
                <div className="bento-grid">
                    {/* Monthly Summary - spans 2 columns */}
                    <Card className="bento-card md:col-span-2 animate-fade-in">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Mjesečni pregled
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                                        {stats?.total_transactions || 0}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Ukupno transakcija</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                                        {stats?.downloaded || 0}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Preuzeto računa</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-accent" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                                        {stats?.pending || 0}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Čeka na obradu</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold font-mono">
                                        {formatAmount(stats?.total_amount || 0)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Ukupni iznos</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Napredak preuzimanja</span>
                                    <span className="font-medium">{progressPercentage}%</span>
                                </div>
                                <Progress value={progressPercentage} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Missing Invoices - spans 1 column, 2 rows */}
                    <Card className="bento-card md:row-span-2 animate-fade-in stagger-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-accent" />
                                Računi koji nedostaju
                            </CardTitle>
                            <CardDescription>
                                Transakcije bez preuzetog računa
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        Svi računi su preuzeti!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentTransactions.map((t, idx) => (
                                        <div 
                                            key={t.id} 
                                            className={cn(
                                                "p-3 rounded-md bg-muted/50 animate-slide-in",
                                                `stagger-${idx + 1}`
                                            )}
                                        >
                                            <p className="font-medium text-sm truncate">
                                                {t.primatelj || 'Nepoznato'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {t.opis_transakcije}
                                            </p>
                                            <p className="text-xs font-mono mt-1">
                                                {t.iznos}
                                            </p>
                                        </div>
                                    ))}
                                    {stats?.pending > 5 && (
                                        <Button 
                                            variant="ghost" 
                                            className="w-full text-sm"
                                            onClick={() => navigate('/transactions?status=pending')}
                                        >
                                            Prikaži još {stats.pending - 5}...
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upload Zone */}
                    <Card className="bento-card animate-fade-in stagger-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Upload className="h-5 w-5 text-primary" />
                                Učitaj CSV
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={cn(
                                    "upload-zone relative",
                                    dragActive && "dragging"
                                )}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('csv-upload').click()}
                                data-testid="upload-zone"
                            >
                                <input
                                    type="file"
                                    id="csv-upload"
                                    accept=".csv"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                    data-testid="csv-upload-input"
                                />
                                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                {uploading ? (
                                    <p className="text-sm text-muted-foreground">Učitavanje...</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium">Povucite CSV ovdje</p>
                                        <p className="text-xs text-muted-foreground mt-1">ili kliknite za odabir</p>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Batches */}
                    <Card className="bento-card md:col-span-3 animate-fade-in stagger-3">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Nedavni upload-ovi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {batches.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <img 
                                        src="https://images.unsplash.com/photo-1597593873848-409a508574f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=300"
                                        alt="Empty state"
                                        className="h-32 w-auto rounded-lg mb-4 opacity-80"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Još niste učitali nijedan CSV
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        className="mt-4"
                                        onClick={() => document.getElementById('csv-upload').click()}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Učitaj prvi CSV
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full data-table">
                                        <thead>
                                            <tr>
                                                <th className="text-left p-3">Datoteka</th>
                                                <th className="text-left p-3">Mjesec</th>
                                                <th className="text-center p-3">Transakcije</th>
                                                <th className="text-center p-3">Preuzeto</th>
                                                <th className="text-right p-3">Akcije</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batches.slice(0, 5).map((batch, idx) => (
                                                <tr key={batch.id} className={`animate-fade-in stagger-${idx + 1}`}>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium text-sm truncate max-w-[150px]">
                                                                {batch.filename}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-sm text-muted-foreground">
                                                        {batch.month}/{batch.year}
                                                    </td>
                                                    <td className="p-3 text-center text-sm">
                                                        {batch.transaction_count}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={cn(
                                                            "status-pill",
                                                            batch.downloaded_count === batch.transaction_count 
                                                                ? "status-found" 
                                                                : "status-pending"
                                                        )}>
                                                            {batch.downloaded_count}/{batch.transaction_count}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/transactions?batch_id=${batch.id}`)}
                                                            data-testid={`view-batch-${batch.id}`}
                                                        >
                                                            Pregledaj
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
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
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { 
    FileText, 
    Search, 
    Download, 
    ExternalLink,
    Check,
    X,
    Filter,
    Upload,
    Mail,
    FileDown,
    Archive,
    Loader2,
    Calendar,
    SearchCheck,
    File,
    Trash2
} from 'lucide-react';
import { transactionApi, emailApi, exportApi, invoiceApi } from '../lib/api';
import { toast } from 'sonner';
import { cn, getStatusLabel, getStatusClass } from '../lib/utils';

export default function Transactions() {
    const [searchParams] = useSearchParams();
    const [transactions, setTransactions] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [batchFilter, setBatchFilter] = useState(searchParams.get('batch_id') || 'all');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [updateData, setUpdateData] = useState({ status: '', invoice_url: '' });
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    // Selection state for batch operations
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    
    // Email search state
    const [emailSearchOpen, setEmailSearchOpen] = useState(false);
    const [emailSearching, setEmailSearching] = useState(false);
    const [emailResults, setEmailResults] = useState([]);
    const [downloadingAttachment, setDownloadingAttachment] = useState(null);
    
    // Batch search state
    const [batchSearchOpen, setBatchSearchOpen] = useState(false);
    const [batchSearching, setBatchSearching] = useState(false);
    const [batchSearchResults, setBatchSearchResults] = useState([]);
    const [batchSearchProgress, setBatchSearchProgress] = useState(0);
    
    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteBatchDialogOpen, setDeleteBatchDialogOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [transRes, batchesRes] = await Promise.all([
                transactionApi.getAll(
                    batchFilter !== 'all' ? batchFilter : null,
                    statusFilter !== 'all' ? statusFilter : null
                ),
                transactionApi.getBatches()
            ]);
            setTransactions(transRes.data);
            setBatches(batchesRes.data);
            setSelectedIds(new Set());
            setSelectAll(false);
        } catch (err) {
            toast.error('Greška pri učitavanju transakcija');
        } finally {
            setLoading(false);
        }
    }, [batchFilter, statusFilter]);

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

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = searchTerm === '' || 
            t.primatelj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.opis_transakcije?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Selection handlers
    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            const pendingIds = filteredTransactions
                .filter(t => t.status === 'pending')
                .map(t => t.id);
            setSelectedIds(new Set(pendingIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id, checked) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleUpdateClick = (transaction) => {
        setSelectedTransaction(transaction);
        setUpdateData({
            status: transaction.status,
            invoice_url: transaction.invoice_url || ''
        });
        setUpdateDialogOpen(true);
    };

    const handleUpdateSubmit = async () => {
        if (!selectedTransaction) return;

        try {
            await transactionApi.update(selectedTransaction.id, updateData);
            toast.success('Transakcija ažurirana');
            setUpdateDialogOpen(false);
            await loadData();
        } catch (err) {
            toast.error('Greška pri ažuriranju');
        }
    };

    const handleQuickStatus = async (transaction, newStatus) => {
        try {
            await transactionApi.update(transaction.id, { status: newStatus });
            toast.success('Status ažuriran');
            await loadData();
        } catch (err) {
            toast.error('Greška pri ažuriranju');
        }
    };

    const handleExportCSV = async () => {
        if (batchFilter === 'all') {
            toast.error('Odaberite batch za export');
            return;
        }

        try {
            const response = await exportApi.csv(batchFilter);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `racuni_${batchFilter.slice(0, 8)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exportiran');
        } catch (err) {
            toast.error('Greška pri exportu');
        }
    };

    const handleExportZIP = async () => {
        if (batchFilter === 'all') {
            toast.error('Odaberite batch za export');
            return;
        }

        try {
            const response = await exportApi.zip(batchFilter);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `racuni_${batchFilter.slice(0, 8)}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('ZIP preuzet');
        } catch (err) {
            const message = err.response?.data?.detail || 'Nema preuzetih računa za download';
            toast.error(message);
        }
    };

    // Download saved invoice
    const handleDownloadInvoice = async (transaction) => {
        try {
            const response = await invoiceApi.download(transaction.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', transaction.invoice_filename || 'racun.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Greška pri preuzimanju računa');
        }
    };

    // Delete functions
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        
        setDeleting(true);
        try {
            const response = await transactionApi.deleteBatchTransactions(Array.from(selectedIds));
            toast.success(response.data.message);
            setDeleteDialogOpen(false);
            setSelectedIds(new Set());
            setSelectAll(false);
            await loadData();
        } catch (err) {
            toast.error('Greška pri brisanju');
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteBatch = async () => {
        if (batchFilter === 'all') return;
        
        setDeleting(true);
        try {
            const response = await transactionApi.deleteBatch(batchFilter);
            toast.success(response.data.message);
            setDeleteBatchDialogOpen(false);
            setBatchFilter('all');
            await loadData();
        } catch (err) {
            toast.error('Greška pri brisanju batch-a');
        } finally {
            setDeleting(false);
        }
    };

    // Single email search
    const handleEmailSearchClick = (transaction) => {
        setSelectedTransaction(transaction);
        setEmailResults([]);
        setEmailSearchOpen(true);
    };

    const handleEmailSearch = async () => {
        if (!selectedTransaction) return;

        setEmailSearching(true);
        try {
            // Calculate date from transaction date (exact day)
            let dateFrom = null;
            let dateTo = null;
            const dateStr = selectedTransaction.datum_izvrsenja;
            
            if (dateStr) {
                try {
                    // Parse date
                    const formats = [
                        { regex: /(\d{4})-(\d{2})-(\d{2})/, order: [1, 2, 3] },
                        { regex: /(\d{2})\.(\d{2})\.(\d{4})/, order: [3, 2, 1] },
                        { regex: /(\d{2})\/(\d{2})\/(\d{4})/, order: [3, 2, 1] },
                        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, order: [3, 1, 2] }, // M/D/YYYY format
                    ];
                    
                    for (const fmt of formats) {
                        const match = dateStr.match(fmt.regex);
                        if (match) {
                            const year = match[fmt.order[0]];
                            const month = match[fmt.order[1]].padStart(2, '0');
                            const day = match[fmt.order[2]].padStart(2, '0');
                            const transDate = new Date(year, month - 1, day);
                            
                            // Same day search
                            const toDate = new Date(transDate);
                            toDate.setDate(toDate.getDate() + 1);
                            
                            dateFrom = transDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                            dateTo = toDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                            break;
                        }
                    }
                } catch (e) {
                    console.error('Date parse error:', e);
                }
            }

            const response = await emailApi.search(
                selectedTransaction.primatelj,
                dateFrom,
                dateTo
            );
            setEmailResults(response.data.results || []);
            if (response.data.results?.length === 0) {
                toast.info('Nisu pronađeni emailovi za ovog dobavljača na taj datum');
            }
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri pretraživanju';
            toast.error(message);
        } finally {
            setEmailSearching(false);
        }
    };

    const handleDownloadAttachment = async (emailId, filename) => {
        if (!selectedTransaction) return;

        setDownloadingAttachment(`${emailId}-${filename}`);
        try {
            const response = await emailApi.downloadAttachment(
                emailId,
                filename,
                selectedTransaction.id
            );
            toast.success(response.data.message);
            setEmailSearchOpen(false);
            await loadData();
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri preuzimanju';
            toast.error(message);
        } finally {
            setDownloadingAttachment(null);
        }
    };

    // Batch search
    const handleBatchSearch = async () => {
        const MAX_BATCH = 15;
        if (selectedIds.size === 0) {
            toast.error('Odaberite transakcije za pretragu');
            return;
        }
        
        if (selectedIds.size > MAX_BATCH) {
            toast.warning(`Maksimalno ${MAX_BATCH} transakcija odjednom. Pretraživat će se prvih ${MAX_BATCH}.`);
        }

        setBatchSearchResults([]);
        setBatchSearchProgress(0);
        setBatchSearching(true);
        setBatchSearchOpen(true);

        try {
            const response = await emailApi.batchSearch(Array.from(selectedIds));
            setBatchSearchResults(response.data.results || []);
            setBatchSearchProgress(100);
            
            const foundCount = response.data.found_count || 0;
            const skipped = response.data.skipped || 0;
            
            let message = `Pronađeno ${foundCount} od ${response.data.total_transactions} računa`;
            if (skipped > 0) {
                message += ` (preskočeno ${skipped})`;
            }
            toast.success(message);
        } catch (err) {
            const message = err.response?.data?.detail || 'Greška pri pretraživanju';
            toast.error(message);
            setBatchSearchOpen(false);
        } finally {
            setBatchSearching(false);
        }
    };

    const handleBatchDownloadAttachment = async (result, emailData, attachment) => {
        const key = `${result.transaction_id}-${emailData.email_id}-${attachment.filename}`;
        setDownloadingAttachment(key);
        
        try {
            await emailApi.downloadAttachment(
                emailData.email_id,
                attachment.filename,
                result.transaction_id
            );
            toast.success(`Račun preuzet za ${result.vendor}`);
            
            // Update result to show downloaded
            setBatchSearchResults(prev => prev.map(r => {
                if (r.transaction_id === result.transaction_id) {
                    return { ...r, downloaded: true };
                }
                return r;
            }));
            
            await loadData();
        } catch (err) {
            toast.error('Greška pri preuzimanju');
        } finally {
            setDownloadingAttachment(null);
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

    const pendingCount = filteredTransactions.filter(t => t.status === 'pending').length;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                            Transakcije
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Pregledajte i upravljajte svojim transakcijama
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button 
                            variant="outline"
                            onClick={() => document.getElementById('csv-upload-trans').click()}
                            disabled={uploading}
                            data-testid="upload-csv-btn"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Učitavanje...' : 'Učitaj CSV'}
                        </Button>
                        <input
                            type="file"
                            id="csv-upload-trans"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                        <Button
                            variant="outline"
                            onClick={handleBatchSearch}
                            disabled={selectedIds.size === 0}
                            data-testid="batch-search-btn"
                        >
                            <SearchCheck className="h-4 w-4 mr-2" />
                            Pretraga ({selectedIds.size})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(true)}
                            disabled={selectedIds.size === 0}
                            className="text-destructive hover:text-destructive"
                            data-testid="delete-selected-btn"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Obriši ({selectedIds.size})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExportCSV}
                            disabled={batchFilter === 'all'}
                            data-testid="export-csv-btn"
                        >
                            <FileDown className="h-4 w-4 mr-2" />
                            CSV
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteBatchDialogOpen(true)}
                            disabled={batchFilter === 'all'}
                            className="text-destructive hover:text-destructive"
                            data-testid="delete-batch-btn"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Obriši batch
                        </Button>
                        <Button
                            onClick={handleExportZIP}
                            disabled={batchFilter === 'all'}
                            data-testid="export-zip-btn"
                        >
                            <Archive className="h-4 w-4 mr-2" />
                            ZIP
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="bento-card">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Pretraži po primatelju ili opisu..."
                                        className="pl-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        data-testid="search-input"
                                    />
                                </div>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[180px]" data-testid="status-filter">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Svi statusi</SelectItem>
                                    <SelectItem value="pending">Čeka</SelectItem>
                                    <SelectItem value="found">Pronađen</SelectItem>
                                    <SelectItem value="downloaded">Preuzet</SelectItem>
                                    <SelectItem value="manual">Ručno</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={batchFilter} onValueChange={setBatchFilter}>
                                <SelectTrigger className="w-full md:w-[200px]" data-testid="batch-filter">
                                    <FileText className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Batch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Svi batch-evi</SelectItem>
                                    {batches.map(b => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.filename.slice(0, 20)}... ({b.month}/{b.year})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Upload Zone when no transactions */}
                {transactions.length === 0 && (
                    <Card className="bento-card">
                        <CardContent className="py-12">
                            <div
                                className={cn(
                                    "upload-zone max-w-md mx-auto",
                                    dragActive && "dragging"
                                )}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('csv-upload-trans').click()}
                                data-testid="upload-zone-empty"
                            >
                                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-lg font-medium">Povucite CSV ovdje</p>
                                <p className="text-sm text-muted-foreground mt-1">ili kliknite za odabir datoteke</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Transactions Table */}
                {filteredTransactions.length > 0 && (
                    <Card className="bento-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full data-table">
                                <thead>
                                    <tr>
                                        <th className="w-10 p-4">
                                            <Checkbox 
                                                checked={selectAll}
                                                onCheckedChange={handleSelectAll}
                                                disabled={pendingCount === 0}
                                                data-testid="select-all-checkbox"
                                            />
                                        </th>
                                        <th className="text-left p-4">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                Datum
                                            </div>
                                        </th>
                                        <th className="text-left p-4">Primatelj</th>
                                        <th className="text-left p-4 hidden lg:table-cell">Opis</th>
                                        <th className="text-right p-4">Iznos</th>
                                        <th className="text-center p-4">Status</th>
                                        <th className="text-center p-4">Podudaranje</th>
                                        <th className="text-center p-4">Račun</th>
                                        <th className="text-right p-4">Akcije</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((t, idx) => (
                                        <tr key={t.id} className={`animate-fade-in stagger-${Math.min(idx + 1, 4)}`}>
                                            <td className="p-4">
                                                {t.status === 'pending' && (
                                                    <Checkbox 
                                                        checked={selectedIds.has(t.id)}
                                                        onCheckedChange={(checked) => handleSelectOne(t.id, checked)}
                                                        data-testid={`select-${t.id}`}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4 text-sm whitespace-nowrap font-mono">
                                                {t.datum_izvrsenja || '-'}
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-sm">
                                                    {t.primatelj || 'Nepoznato'}
                                                </span>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
                                                    {t.opis_transakcije}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={cn(
                                                    "font-mono text-sm",
                                                    t.iznos?.startsWith('-') ? 'amount-negative' : 'amount-positive'
                                                )}>
                                                    {t.iznos}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={cn(
                                                    "status-pill",
                                                    t.status === 'manual' && !t.invoice_path ? "bg-red-100 text-red-700" : getStatusClass(t.status)
                                                )}>
                                                    {t.status === 'manual' && !t.invoice_path ? 'Nije pronađeno' : getStatusLabel(t.status)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {t.search_confidence > 0 ? (
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        t.search_confidence >= 70 ? "text-green-600" :
                                                        t.search_confidence >= 50 ? "text-yellow-600" :
                                                        "text-red-600"
                                                    )}>
                                                        {t.search_confidence}%
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {(t.status === 'downloaded' || t.invoice_path) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => handleDownloadInvoice(t)}
                                                        title="Preuzmi račun"
                                                        data-testid={`download-invoice-${t.id}`}
                                                    >
                                                        <File className="h-4 w-4 text-primary" />
                                                    </Button>
                                                )}
                                                {t.invoice_url && !t.invoice_path && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => window.open(t.invoice_url, '_blank')}
                                                        title="Otvori link računa"
                                                        data-testid={`open-invoice-url-${t.id}`}
                                                    >
                                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {t.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => handleEmailSearchClick(t)}
                                                                title="Pretraži email"
                                                                data-testid={`search-email-${t.id}`}
                                                            >
                                                                <Mail className="h-4 w-4 text-primary" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => handleQuickStatus(t, 'downloaded')}
                                                                title="Označi kao preuzeto"
                                                                data-testid={`mark-downloaded-${t.id}`}
                                                            >
                                                                <Check className="h-4 w-4 text-primary" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => handleQuickStatus(t, 'manual')}
                                                                title="Označi za ručno"
                                                                data-testid={`mark-manual-${t.id}`}
                                                            >
                                                                <X className="h-4 w-4 text-accent" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUpdateClick(t)}
                                                        data-testid={`edit-transaction-${t.id}`}
                                                    >
                                                        Uredi
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* No results */}
                {filteredTransactions.length === 0 && transactions.length > 0 && (
                    <Card className="bento-card">
                        <CardContent className="py-12 text-center">
                            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-lg font-medium">Nema rezultata</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Pokušajte promijeniti filtere ili pretragu
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Update Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Uredi transakciju</DialogTitle>
                        <DialogDescription>
                            {selectedTransaction?.primatelj} - {selectedTransaction?.iznos}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                                value={updateData.status} 
                                onValueChange={(v) => setUpdateData({...updateData, status: v})}
                            >
                                <SelectTrigger data-testid="update-status-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Čeka</SelectItem>
                                    <SelectItem value="found">Pronađen</SelectItem>
                                    <SelectItem value="downloaded">Preuzet</SelectItem>
                                    <SelectItem value="manual">Ručno</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Link računa (opcionalno)</Label>
                            <Input
                                placeholder="https://..."
                                value={updateData.invoice_url}
                                onChange={(e) => setUpdateData({...updateData, invoice_url: e.target.value})}
                                data-testid="update-invoice-url"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                            Odustani
                        </Button>
                        <Button onClick={handleUpdateSubmit} data-testid="update-submit-btn">
                            Spremi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single Email Search Dialog */}
            <Dialog open={emailSearchOpen} onOpenChange={setEmailSearchOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Pretraži email za račun
                        </DialogTitle>
                        <DialogDescription>
                            <strong>{selectedTransaction?.primatelj}</strong> | Datum: <strong>{selectedTransaction?.datum_izvrsenja}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <Button 
                            onClick={handleEmailSearch} 
                            disabled={emailSearching}
                            className="w-full"
                            data-testid="email-search-btn"
                        >
                            {emailSearching ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Pretraživanje...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Pretraži emailove (datum: {selectedTransaction?.datum_izvrsenja})
                                </>
                            )}
                        </Button>

                        {emailResults.length > 0 && (
                            <ScrollArea className="h-[300px] mt-4 rounded-md border">
                                <div className="p-4 space-y-3">
                                    {emailResults.map((email, idx) => (
                                        <div 
                                            key={idx}
                                            className="p-3 rounded-lg bg-muted/50 space-y-2"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {email.subject}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        Od: {email.from}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {email.date}
                                                    </p>
                                                </div>
                                                {email.has_pdf && (
                                                    <span className="status-pill status-found text-xs">
                                                        PDF
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {email.attachments?.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        Privici:
                                                    </p>
                                                    {email.attachments.map((att, attIdx) => (
                                                        <div 
                                                            key={attIdx}
                                                            className="flex items-center justify-between gap-2 p-2 bg-background rounded"
                                                        >
                                                            <span className="text-xs truncate flex-1">
                                                                {att.filename}
                                                            </span>
                                                            {att.is_pdf && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleDownloadAttachment(email.email_id, att.filename)}
                                                                    disabled={downloadingAttachment === `${email.email_id}-${att.filename}`}
                                                                    data-testid={`download-attachment-${idx}-${attIdx}`}
                                                                >
                                                                    {downloadingAttachment === `${email.email_id}-${att.filename}` ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <Download className="h-3 w-3 mr-1" />
                                                                            Preuzmi
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        {emailResults.length === 0 && !emailSearching && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Kliknite "Pretraži emailove" za početak</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailSearchOpen(false)}>
                            Zatvori
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Search Dialog */}
            <Dialog open={batchSearchOpen} onOpenChange={setBatchSearchOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SearchCheck className="h-5 w-5" />
                            Batch pretraga računa
                        </DialogTitle>
                        <DialogDescription>
                            Pretraživanje {selectedIds.size} transakcija
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        {batchSearching && (
                            <div className="space-y-2">
                                <Progress value={batchSearchProgress} className="h-2" />
                                <p className="text-sm text-center text-muted-foreground">
                                    <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                                    Pretraživanje emailova...
                                </p>
                            </div>
                        )}

                        {!batchSearching && batchSearchResults.length > 0 && (
                            <ScrollArea className="h-[400px] rounded-md border">
                                <div className="p-4 space-y-3">
                                    {batchSearchResults.map((result, idx) => (
                                        <div 
                                            key={idx}
                                            className={cn(
                                                "p-3 rounded-lg border",
                                                result.found ? "bg-primary/5 border-primary/20" : "bg-red-50 border-red-200",
                                                result.downloaded && "bg-green-50 border-green-200"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-medium text-sm">
                                                            {result.vendor}
                                                        </p>
                                                        {result.downloaded ? (
                                                            <span className="status-pill status-downloaded text-xs">
                                                                <Check className="h-3 w-3 mr-1" />
                                                                Preuzet
                                                            </span>
                                                        ) : result.found ? (
                                                            <span className="status-pill status-found text-xs">
                                                                Pronađen ({result.total_found})
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                Nije pronađeno
                                                            </span>
                                                        )}
                                                        {result.confidence > 0 && (
                                                            <span className={cn(
                                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                                result.confidence >= 70 ? "bg-green-100 text-green-700" :
                                                                result.confidence >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-red-100 text-red-700"
                                                            )}>
                                                                {result.confidence}% podudaranje
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Datum: {result.date}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {result.found && !result.downloaded && result.emails?.length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {result.emails.slice(0, 2).map((email, emailIdx) => (
                                                        <div key={emailIdx} className="p-2 bg-background rounded text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-medium truncate flex-1">{email.subject}</p>
                                                                {email.confidence && (
                                                                    <span className={cn(
                                                                        "ml-2 px-1.5 py-0.5 rounded text-xs",
                                                                        email.confidence >= 70 ? "bg-green-100 text-green-700" :
                                                                        email.confidence >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                                        "bg-red-100 text-red-700"
                                                                    )}>
                                                                        {email.confidence}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-muted-foreground">{email.date}</p>
                                                            {email.attachments?.filter(a => a.is_pdf).map((att, attIdx) => (
                                                                <div key={attIdx} className="flex items-center justify-between mt-1">
                                                                    <span className="truncate">{att.filename}</span>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleBatchDownloadAttachment(result, email, att)}
                                                                        disabled={downloadingAttachment === `${result.transaction_id}-${email.email_id}-${att.filename}`}
                                                                    >
                                                                        {downloadingAttachment === `${result.transaction_id}-${email.email_id}-${att.filename}` ? (
                                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                <Download className="h-3 w-3 mr-1" />
                                                                                Preuzmi
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {result.error && (
                                                <p className="text-xs text-destructive mt-1">{result.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBatchSearchOpen(false)}>
                            Zatvori
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Selected Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Obriši transakcije
                        </DialogTitle>
                        <DialogDescription>
                            Jeste li sigurni da želite obrisati {selectedIds.size} odabranih transakcija? 
                            Ova akcija se ne može poništiti.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                            Odustani
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteSelected}
                            disabled={deleting}
                            data-testid="confirm-delete-selected-btn"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Brisanje...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Obriši ({selectedIds.size})
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Batch Dialog */}
            <Dialog open={deleteBatchDialogOpen} onOpenChange={setDeleteBatchDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Obriši cijeli batch
                        </DialogTitle>
                        <DialogDescription>
                            Jeste li sigurni da želite obrisati cijeli batch i sve njegove transakcije? 
                            Ova akcija se ne može poništiti.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteBatchDialogOpen(false)} disabled={deleting}>
                            Odustani
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteBatch}
                            disabled={deleting}
                            data-testid="confirm-delete-batch-btn"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Brisanje...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Obriši batch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

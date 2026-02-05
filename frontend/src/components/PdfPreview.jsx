import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Download, ExternalLink, Loader2, FileText, X } from 'lucide-react';
import { invoiceApi } from '../lib/api';

export function PdfPreviewDialog({ open, onOpenChange, transaction }) {
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && transaction) {
            loadPdf();
        }
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
        };
    }, [open, transaction?.id]);

    const loadPdf = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await invoiceApi.download(transaction.id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (err) {
            setError('Nije moguce ucitati PDF');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', transaction?.invoice_filename || 'racun.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleClose = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-3 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-5 w-5 text-primary" />
                            {transaction?.invoice_filename || 'Pregled racuna'}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={!pdfUrl}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Preuzmi
                            </Button>
                            {pdfUrl && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(pdfUrl, '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Otvori
                                </Button>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {transaction?.primatelj} | {transaction?.datum_izvrsenja} | {transaction?.iznos}
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-muted/30">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">Ucitavanje PDF-a...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-sm text-destructive">{error}</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={loadPdf}>
                                    Pokusaj ponovno
                                </Button>
                            </div>
                        </div>
                    )}

                    {pdfUrl && !loading && !error && (
                        <iframe
                            src={pdfUrl}
                            title="PDF Preview"
                            className="w-full h-full border-0"
                            style={{ minHeight: '100%' }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

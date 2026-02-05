# FinZen - Aplikacija za upravljanje računima

## Original Problem Statement
Korisnik želi aplikaciju za organizaciju mjesečnih računa iz emaila. Aplikacija treba:
- Pristupiti Zoho emailu
- Preuzeti račune na temelju CSV datoteke s bankovnim transakcijama
- Prepoznati dobavljače i organizirati račune
- Omogućiti export CSV-a s linkovima
- Omogućiti ZIP download svih računa

## User Personas
- **Vlasnici malih poduzeća** - trebaju organizirati mjesečne račune za računovodstvo
- **Računovođe** - trebaju prikupiti sve račune od klijenata
- **Administratori** - trebaju arhivirati dokumente

## Core Requirements (Static)
1. JWT autentifikacija
2. CSV upload i parsiranje transakcija
3. Vendor management s uputama za preuzimanje
4. Status tracking računa (pending/found/downloaded/manual)
5. CSV export s rezultatima
6. Zoho Mail IMAP integracija
7. ZIP download računa

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Python + IMAP
- **Database**: MongoDB
- **Auth**: JWT tokens

## What's Been Implemented (December 2025)

### Phase 1 - MVP
- ✅ User registration & login (JWT)
- ✅ Dashboard with stats widgets (Bento grid layout)
- ✅ CSV upload & parsing with vendor matching
- ✅ Transactions page with filtering/sorting
- ✅ Vendor management (CRUD)
- ✅ Settings page for Zoho configuration
- ✅ Transaction status updates
- ✅ CSV export functionality
- ✅ Croatian language UI
- ✅ Responsive design

### Phase 2 - Email Integration
- ✅ Zoho Mail IMAP integration (ZohoMailClient class)
- ✅ Email search by vendor name
- ✅ Email attachment listing
- ✅ PDF attachment download from email
- ✅ Test connection functionality
- ✅ ZIP download of all invoices per batch

## API Endpoints
- POST /api/auth/register - Registracija
- POST /api/auth/login - Prijava
- GET /api/auth/me - Trenutni korisnik
- POST/GET /api/settings/zoho - Zoho konfiguracija
- CRUD /api/vendors - Upravljanje dobavljačima
- POST /api/upload/csv - Upload transakcija
- GET /api/batches - Popis batch-eva
- GET /api/transactions - Popis transakcija
- PUT /api/transactions/{id} - Ažuriranje transakcije
- GET /api/stats - Statistike
- GET /api/export/csv/{batch_id} - CSV export
- GET /api/export/zip/{batch_id} - ZIP download računa
- POST /api/email/search - Pretraživanje emaila
- POST /api/email/download-attachment - Preuzimanje privitka
- GET /api/email/test-connection - Test Zoho veze

## Prioritized Backlog

### P1 - High
- PDF preview in app
- Batch operations for transactions
- Search across all batches
- Automatic scheduled email check

### P2 - Medium
- Dark mode support
- Email notifications
- Recurring vendor detection
- OCR for invoice data extraction

## Next Tasks
1. PDF preview unutar aplikacije
2. Automatsko periodično pretraživanje emaila
3. Batch označavanje transakcija

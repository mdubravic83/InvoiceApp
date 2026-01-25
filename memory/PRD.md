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
6. Zoho Mail integracija (placeholder - zahtijeva OAuth setup)

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **Auth**: JWT tokens

## What's Been Implemented (December 2025)
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

## Prioritized Backlog

### P0 - Critical (Next)
- ZIP download of all invoices for a batch
- Automatic email attachment download (requires Zoho OAuth)

### P1 - High
- PDF preview in app
- Batch operations for transactions
- Search across all batches

### P2 - Medium
- Dark mode support
- Email notifications
- Recurring vendor detection

## Next Tasks
1. Implement full Zoho OAuth flow for email access
2. Add ZIP download feature for batch invoices
3. Implement automatic email search and attachment download

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import csv
import io
import zipfile
import httpx
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = 'finzen-dev-secret-key-not-for-production'
    logger.warning("JWT_SECRET not set in environment, using development fallback. DO NOT USE IN PRODUCTION!")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI(title="FinZen API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    zoho_configured: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ZohoConfig(BaseModel):
    zoho_email: str
    zoho_app_password: str

class SearchSettings(BaseModel):
    date_range_days: int = 0  # 0 = exact day, 1+ = ± days
    search_all_fields: bool = True  # Search in all transaction fields

class VendorCreate(BaseModel):
    name: str
    keywords: List[str] = []
    download_url: Optional[str] = None
    instructions: Optional[str] = None

class VendorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    keywords: List[str] = []
    download_url: Optional[str] = None
    instructions: Optional[str] = None
    created_at: datetime

class TransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    batch_id: str
    datum_izvrsenja: str
    primatelj: str
    opis_transakcije: str
    iznos: str
    status: str  # pending, found, downloaded, manual
    invoice_filename: Optional[str] = None
    invoice_url: Optional[str] = None
    vendor_id: Optional[str] = None
    created_at: datetime

class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    invoice_filename: Optional[str] = None
    invoice_url: Optional[str] = None

class BatchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    filename: str
    month: str
    year: str
    transaction_count: int
    downloaded_count: int
    created_at: datetime

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Nevažeći token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Korisnik nije pronađen")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token je istekao")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Nevažeći token")

def normalize_vendor_name(name: str) -> str:
    """Normalize vendor name for matching"""
    return re.sub(r'[^a-z0-9]', '', name.lower())

def match_vendor(transaction_recipient: str, transaction_desc: str, vendors: list) -> Optional[dict]:
    """Try to match a transaction to a vendor"""
    search_text = f"{transaction_recipient} {transaction_desc}".lower()
    
    for vendor in vendors:
        # Check vendor name
        if normalize_vendor_name(vendor['name']) in normalize_vendor_name(search_text):
            return vendor
        # Check keywords
        for keyword in vendor.get('keywords', []):
            if keyword.lower() in search_text:
                return vendor
    return None

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email već postoji")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "zoho_email": None,
        "zoho_app_password": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id, "email": data.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            name=data.name,
            zoho_configured=False
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Pogrešan email ili lozinka")
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            zoho_configured=bool(user.get("zoho_email"))
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        zoho_configured=bool(user.get("zoho_email"))
    )

# ============== ZOHO CONFIG ROUTES ==============

@api_router.post("/settings/zoho")
async def save_zoho_config(config: ZohoConfig, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "zoho_email": config.zoho_email,
            "zoho_app_password": config.zoho_app_password
        }}
    )
    return {"message": "Zoho konfiguracija spremljena"}

@api_router.get("/settings/zoho")
async def get_zoho_config(user: dict = Depends(get_current_user)):
    return {
        "zoho_email": user.get("zoho_email", ""),
        "zoho_configured": bool(user.get("zoho_email"))
    }

@api_router.post("/settings/search")
async def save_search_settings(settings: SearchSettings, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "date_range_days": settings.date_range_days,
            "search_all_fields": settings.search_all_fields
        }}
    )
    return {"message": "Postavke pretrage spremljene"}

@api_router.get("/settings/search")
async def get_search_settings(user: dict = Depends(get_current_user)):
    return {
        "date_range_days": user.get("date_range_days", 0),
        "search_all_fields": user.get("search_all_fields", True)
    }

# ============== VENDOR ROUTES ==============

@api_router.post("/vendors", response_model=VendorResponse)
async def create_vendor(data: VendorCreate, user: dict = Depends(get_current_user)):
    vendor_id = str(uuid.uuid4())
    vendor_doc = {
        "id": vendor_id,
        "user_id": user["id"],
        "name": data.name,
        "keywords": data.keywords,
        "download_url": data.download_url,
        "instructions": data.instructions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendors.insert_one(vendor_doc)
    vendor_doc["created_at"] = datetime.fromisoformat(vendor_doc["created_at"])
    return VendorResponse(**vendor_doc)

@api_router.get("/vendors", response_model=List[VendorResponse])
async def get_vendors(user: dict = Depends(get_current_user)):
    vendors = await db.vendors.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    for v in vendors:
        if isinstance(v['created_at'], str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
    return vendors

@api_router.put("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(vendor_id: str, data: VendorCreate, user: dict = Depends(get_current_user)):
    result = await db.vendors.update_one(
        {"id": vendor_id, "user_id": user["id"]},
        {"$set": {
            "name": data.name,
            "keywords": data.keywords,
            "download_url": data.download_url,
            "instructions": data.instructions
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dobavljač nije pronađen")
    
    vendor = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if isinstance(vendor['created_at'], str):
        vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
    return VendorResponse(**vendor)

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, user: dict = Depends(get_current_user)):
    result = await db.vendors.delete_one({"id": vendor_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dobavljač nije pronađen")
    return {"message": "Dobavljač obrisan"}

# ============== CSV UPLOAD & TRANSACTIONS ==============

@api_router.post("/upload/csv")
async def upload_csv(
    file: UploadFile = File(...),
    month: str = "12",
    year: str = "2025",
    user: dict = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Samo CSV datoteke su dozvoljene")
    
    content = await file.read()
    
    # Try different encodings
    for encoding in ['utf-8', 'cp1250', 'iso-8859-2', 'latin-1']:
        try:
            text_content = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(status_code=400, detail="Nije moguće pročitati CSV datoteku")
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(text_content))
    
    batch_id = str(uuid.uuid4())
    transactions = []
    
    # Get user's vendors for matching
    vendors = await db.vendors.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Log available columns for debugging
    logger.info(f"CSV columns: {reader.fieldnames}")
    
    for row in reader:
        # Map CSV columns - try multiple possible column names
        datum = (
            row.get('Datum izvršenja') or 
            row.get('Datum izvrsenja') or
            row.get('Datum knjiženja') or
            row.get('Datum knjizenja') or
            row.get('Datum') or 
            ''
        ).strip()
        
        primatelj = (
            row.get('Primatelj') or 
            row.get('Naziv') or
            row.get('Naziv primatelja') or
            ''
        ).strip()
        
        opis = (
            row.get('Opis transakcije') or 
            row.get('Opis transa') or
            row.get('Opis') or
            row.get('Napomena') or
            ''
        ).strip()
        
        iznos = (
            row.get('Ukupan iznos') or 
            row.get('Ukupan izn') or
            row.get('Iznos') or
            row.get('Iznos transakcije') or
            ''
        ).strip()
        
        # Skip empty rows
        if not primatelj and not opis:
            continue
        
        # Try to match vendor
        matched_vendor = match_vendor(primatelj, opis, vendors)
        
        trans_id = str(uuid.uuid4())
        transaction_doc = {
            "id": trans_id,
            "user_id": user["id"],
            "batch_id": batch_id,
            "datum_izvrsenja": datum,
            "primatelj": primatelj,
            "opis_transakcije": opis,
            "iznos": iznos,
            "status": "pending",
            "invoice_filename": None,
            "invoice_url": None,
            "vendor_id": matched_vendor["id"] if matched_vendor else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        transactions.append(transaction_doc)
    
    if transactions:
        await db.transactions.insert_many(transactions)
    
    # Create batch record
    batch_doc = {
        "id": batch_id,
        "user_id": user["id"],
        "filename": file.filename,
        "month": month,
        "year": year,
        "transaction_count": len(transactions),
        "downloaded_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.batches.insert_one(batch_doc)
    
    return {
        "batch_id": batch_id,
        "transaction_count": len(transactions),
        "message": f"Učitano {len(transactions)} transakcija"
    }

@api_router.get("/batches", response_model=List[BatchResponse])
async def get_batches(user: dict = Depends(get_current_user)):
    batches = await db.batches.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    if not batches:
        return []
    
    # Get all batch IDs
    batch_ids = [b["id"] for b in batches]
    
    # Single aggregation query to get downloaded counts for all batches
    pipeline = [
        {"$match": {
            "user_id": user["id"],
            "batch_id": {"$in": batch_ids},
            "status": {"$in": ["downloaded", "found"]}
        }},
        {"$group": {
            "_id": "$batch_id",
            "count": {"$sum": 1}
        }}
    ]
    
    counts_cursor = db.transactions.aggregate(pipeline)
    counts_list = await counts_cursor.to_list(1000)
    
    # Create a lookup dict for counts
    counts_dict = {item["_id"]: item["count"] for item in counts_list}
    
    # Update batches with counts
    for b in batches:
        if isinstance(b['created_at'], str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
        b['downloaded_count'] = counts_dict.get(b["id"], 0)
    
    return batches

@api_router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    if batch_id:
        query["batch_id"] = batch_id
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("datum_izvrsenja", -1).to_list(1000)
    for t in transactions:
        if isinstance(t['created_at'], str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return transactions

@api_router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nema podataka za ažuriranje")
    
    result = await db.transactions.update_one(
        {"id": transaction_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transakcija nije pronađena")
    
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if isinstance(transaction['created_at'], str):
        transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    return TransactionResponse(**transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    """Delete a single transaction"""
    result = await db.transactions.delete_one({"id": transaction_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transakcija nije pronađena")
    return {"message": "Transakcija obrisana"}

class DeleteTransactionsRequest(BaseModel):
    transaction_ids: List[str]

@api_router.post("/transactions/delete-batch")
async def delete_transactions_batch(request: DeleteTransactionsRequest, user: dict = Depends(get_current_user)):
    """Delete multiple transactions"""
    result = await db.transactions.delete_many({
        "id": {"$in": request.transaction_ids},
        "user_id": user["id"]
    })
    return {"message": f"Obrisano {result.deleted_count} transakcija", "deleted_count": result.deleted_count}

@api_router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Delete a batch and all its transactions"""
    # Delete all transactions in batch
    trans_result = await db.transactions.delete_many({"batch_id": batch_id, "user_id": user["id"]})
    
    # Delete batch record
    batch_result = await db.batches.delete_one({"id": batch_id, "user_id": user["id"]})
    
    if batch_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Batch nije pronađen")
    
    return {"message": f"Batch obrisan ({trans_result.deleted_count} transakcija)"}

# ============== STATS ==============

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    total_transactions = await db.transactions.count_documents({"user_id": user["id"]})
    pending = await db.transactions.count_documents({"user_id": user["id"], "status": "pending"})
    downloaded = await db.transactions.count_documents({"user_id": user["id"], "status": {"$in": ["downloaded", "found"]}})
    manual = await db.transactions.count_documents({"user_id": user["id"], "status": "manual"})
    
    # Get total amount
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$project": {
            "amount": {
                "$toDouble": {
                    "$replaceAll": {
                        "input": {"$replaceAll": {"input": "$iznos", "find": " EUR", "replacement": ""}},
                        "find": ",",
                        "replacement": "."
                    }
                }
            }
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    try:
        result = await db.transactions.aggregate(pipeline).to_list(1)
        total_amount = abs(result[0]["total"]) if result else 0
    except:
        total_amount = 0
    
    return {
        "total_transactions": total_transactions,
        "pending": pending,
        "downloaded": downloaded,
        "manual": manual,
        "total_amount": round(total_amount, 2),
        "vendors_count": await db.vendors.count_documents({"user_id": user["id"]})
    }

# ============== EXPORT ==============

@api_router.get("/export/csv/{batch_id}")
async def export_csv(batch_id: str, user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"batch_id": batch_id, "user_id": user["id"]},
        {"_id": 0}
    ).to_list(10000)
    
    if not transactions:
        raise HTTPException(status_code=404, detail="Nema transakcija za export")
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Datum izvršenja",
        "Primatelj",
        "Opis transakcije",
        "Iznos",
        "Status",
        "Račun preuzet",
        "Link računa"
    ])
    
    for t in transactions:
        status_map = {
            "pending": "Čeka",
            "found": "Pronađen",
            "downloaded": "Preuzet",
            "manual": "Ručno"
        }
        writer.writerow([
            t.get("datum_izvrsenja", ""),
            t.get("primatelj", ""),
            t.get("opis_transakcije", ""),
            t.get("iznos", ""),
            status_map.get(t.get("status", ""), ""),
            "Da" if t.get("invoice_filename") else "Ne",
            t.get("invoice_url", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=racuni_{batch_id[:8]}.csv"}
    )

# ============== ZOHO MAIL IMAP INTEGRATION ==============

import imaplib
import email
from email.header import decode_header
import base64

# Directory for storing downloaded invoices
INVOICES_DIR = ROOT_DIR / "invoices"
INVOICES_DIR.mkdir(exist_ok=True)

class ZohoMailClient:
    """Zoho Mail IMAP Client for fetching emails and attachments"""
    
    IMAP_SERVERS = {
        "pro": "imappro.zoho.com",  # Zoho Workplace/Pro accounts
        "eu": "imap.zoho.eu",
        "com": "imap.zoho.com", 
        "in": "imap.zoho.in",
        "au": "imap.zoho.com.au"
    }
    IMAP_PORT = 993
    
    def __init__(self, email_address: str, app_password: str, region: str = None):
        self.email_address = email_address
        self.app_password = app_password
        self.connection = None
        # Auto-detect region from email domain or use provided
        if region:
            self.region = region
        else:
            # Default to 'pro' for custom domains (Zoho Workplace)
            self.region = 'pro'
    
    def connect(self):
        """Connect to Zoho IMAP server, try multiple regions if needed"""
        regions_to_try = [self.region] + [r for r in self.IMAP_SERVERS.keys() if r != self.region]
        
        last_error = None
        for region in regions_to_try:
            try:
                server = self.IMAP_SERVERS[region]
                logger.info(f"Trying IMAP server: {server}")
                self.connection = imaplib.IMAP4_SSL(server, self.IMAP_PORT)
                self.connection.login(self.email_address, self.app_password)
                logger.info(f"Successfully connected to {server}")
                return True
            except imaplib.IMAP4.error as e:
                logger.error(f"IMAP login failed on {server}: {e}")
                last_error = e
                if self.connection:
                    try:
                        self.connection.logout()
                    except:
                        pass
                self.connection = None
                continue
        
        # All servers failed
        raise HTTPException(
            status_code=400, 
            detail=f"Greška pri prijavi na Zoho Mail. Provjerite: 1) Je li IMAP omogućen u Zoho postavkama, 2) Je li App Password ispravan, 3) Email adresu"
        )
    
    def disconnect(self):
        """Disconnect from IMAP server"""
        if self.connection:
            try:
                self.connection.logout()
            except:
                pass
    
    def search_emails(self, search_term: str, date_from: str = None, date_to: str = None, folder: str = "INBOX", ignore_date: bool = False):
        """Search for emails containing the search term"""
        if not self.connection:
            self.connect()
        
        self.connection.select(folder)
        
        # Sanitize search term - remove special characters that break IMAP
        import unicodedata
        safe_search = ''.join(
            c for c in search_term 
            if unicodedata.category(c) not in ('Mn', 'Mc', 'Me') and ord(c) < 128
        ).strip()
        
        # If nothing left after sanitization, use first word
        if not safe_search and search_term:
            words = search_term.split()
            for word in words:
                safe_word = ''.join(c for c in word if ord(c) < 128).strip()
                if safe_word and len(safe_word) > 2:
                    safe_search = safe_word
                    break
        
        if not safe_search:
            logger.warning(f"Could not create safe search term from: {search_term}")
            return []
        
        logger.info(f"Searching for: '{safe_search}' (original: '{search_term}')")
        
        # Try multiple search strategies
        all_results = []
        seen_ids = set()
        
        # Strategy 1: Search in SUBJECT
        try:
            search_str = f'SUBJECT "{safe_search}"'
            if not ignore_date and date_from:
                search_str += f' SINCE {date_from}'
            if not ignore_date and date_to:
                search_str += f' BEFORE {date_to}'
            
            status, messages = self.connection.search(None, search_str)
            if status == 'OK' and messages[0]:
                for eid in messages[0].split()[-10:]:
                    if eid not in seen_ids:
                        seen_ids.add(eid)
                        all_results.append(eid)
        except Exception as e:
            logger.error(f"Subject search error: {e}")
        
        # Strategy 2: Search in FROM
        try:
            search_str = f'FROM "{safe_search}"'
            if not ignore_date and date_from:
                search_str += f' SINCE {date_from}'
            if not ignore_date and date_to:
                search_str += f' BEFORE {date_to}'
            
            status, messages = self.connection.search(None, search_str)
            if status == 'OK' and messages[0]:
                for eid in messages[0].split()[-10:]:
                    if eid not in seen_ids:
                        seen_ids.add(eid)
                        all_results.append(eid)
        except Exception as e:
            logger.error(f"From search error: {e}")
        
        # Strategy 3: If no results with date, try without date filter
        if not all_results and (date_from or date_to):
            try:
                # Try subject without date
                status, messages = self.connection.search(None, f'SUBJECT "{safe_search}"')
                if status == 'OK' and messages[0]:
                    for eid in messages[0].split()[-10:]:
                        if eid not in seen_ids:
                            seen_ids.add(eid)
                            all_results.append(eid)
                
                # Try from without date
                status, messages = self.connection.search(None, f'FROM "{safe_search}"')
                if status == 'OK' and messages[0]:
                    for eid in messages[0].split()[-10:]:
                        if eid not in seen_ids:
                            seen_ids.add(eid)
                            all_results.append(eid)
            except Exception as e:
                logger.error(f"No-date search error: {e}")
        
        # Limit results
        email_ids = all_results[-20:]
        logger.info(f"Found {len(email_ids)} emails for '{safe_search}'")
        
        results = []
        for email_id in email_ids:
            try:
                status, msg_data = self.connection.fetch(email_id, '(RFC822.HEADER)')
                if status != 'OK':
                    continue
                
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Decode subject
                        subject = ""
                        if msg["Subject"]:
                            decoded = decode_header(msg["Subject"])
                            for part, encoding in decoded:
                                if isinstance(part, bytes):
                                    subject += part.decode(encoding or 'utf-8', errors='ignore')
                                else:
                                    subject += part
                        
                        # Get from address
                        from_addr = msg.get("From", "")
                        
                        # Get date
                        date_str = msg.get("Date", "")
                        
                        # Add to results (no additional filtering - IMAP already filtered)
                        results.append({
                            "email_id": email_id.decode() if isinstance(email_id, bytes) else str(email_id),
                            "subject": subject,
                            "from": from_addr,
                            "date": date_str
                        })
            except Exception as e:
                logger.error(f"Error parsing email {email_id}: {e}")
                continue
        
        return results
    
    def get_email_attachments(self, email_id: str, folder: str = "INBOX"):
        """Get list of attachments from an email"""
        if not self.connection:
            self.connect()
        
        self.connection.select(folder)
        
        try:
            status, msg_data = self.connection.fetch(email_id.encode(), '(RFC822)')
            if status != 'OK':
                return []
            
            attachments = []
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    for part in msg.walk():
                        if part.get_content_maintype() == 'multipart':
                            continue
                        
                        filename = part.get_filename()
                        if filename:
                            # Decode filename if needed
                            decoded = decode_header(filename)
                            decoded_filename = ""
                            for part_text, encoding in decoded:
                                if isinstance(part_text, bytes):
                                    decoded_filename += part_text.decode(encoding or 'utf-8', errors='ignore')
                                else:
                                    decoded_filename += part_text
                            
                            content_type = part.get_content_type()
                            attachments.append({
                                "filename": decoded_filename,
                                "content_type": content_type,
                                "is_pdf": content_type == 'application/pdf' or decoded_filename.lower().endswith('.pdf')
                            })
            
            return attachments
        except Exception as e:
            logger.error(f"Error getting attachments: {e}")
            return []
    
    def download_attachment(self, email_id: str, attachment_filename: str, folder: str = "INBOX") -> Optional[bytes]:
        """Download a specific attachment from an email"""
        if not self.connection:
            self.connect()
        
        self.connection.select(folder)
        
        try:
            status, msg_data = self.connection.fetch(email_id.encode(), '(RFC822)')
            if status != 'OK':
                return None
            
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    for part in msg.walk():
                        if part.get_content_maintype() == 'multipart':
                            continue
                        
                        filename = part.get_filename()
                        if filename:
                            decoded = decode_header(filename)
                            decoded_filename = ""
                            for part_text, enc in decoded:
                                if isinstance(part_text, bytes):
                                    decoded_filename += part_text.decode(enc or 'utf-8', errors='ignore')
                                else:
                                    decoded_filename += part_text
                            
                            if decoded_filename == attachment_filename:
                                return part.get_payload(decode=True)
            
            return None
        except Exception as e:
            logger.error(f"Error downloading attachment: {e}")
            return None


class EmailSearchRequest(BaseModel):
    vendor_name: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class DownloadAttachmentRequest(BaseModel):
    email_id: str
    filename: str
    transaction_id: str

@api_router.post("/email/search")
async def search_email(
    request: EmailSearchRequest,
    user: dict = Depends(get_current_user)
):
    """Search for invoices in Zoho Mail"""
    if not user.get("zoho_email") or not user.get("zoho_app_password"):
        raise HTTPException(
            status_code=400,
            detail="Zoho email nije konfiguriran. Molimo konfigurirajte u postavkama."
        )
    
    try:
        mail_client = ZohoMailClient(user["zoho_email"], user["zoho_app_password"])
        mail_client.connect()
        
        results = mail_client.search_emails(
            search_term=request.vendor_name,
            date_from=request.date_from,
            date_to=request.date_to
        )
        
        # Get attachments info for each email
        for result in results:
            attachments = mail_client.get_email_attachments(result["email_id"])
            result["attachments"] = attachments
            result["has_pdf"] = any(a.get("is_pdf") for a in attachments)
        
        mail_client.disconnect()
        
        return {
            "success": True,
            "count": len(results),
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email search error: {e}")
        raise HTTPException(status_code=500, detail=f"Greška pri pretraživanju emaila: {str(e)}")

@api_router.post("/email/download-attachment")
async def download_email_attachment(
    request: DownloadAttachmentRequest,
    user: dict = Depends(get_current_user)
):
    """Download attachment from email and save to transaction"""
    if not user.get("zoho_email") or not user.get("zoho_app_password"):
        raise HTTPException(
            status_code=400,
            detail="Zoho email nije konfiguriran."
        )
    
    try:
        mail_client = ZohoMailClient(user["zoho_email"], user["zoho_app_password"])
        mail_client.connect()
        
        # Download attachment
        attachment_data = mail_client.download_attachment(request.email_id, request.filename)
        mail_client.disconnect()
        
        if not attachment_data:
            raise HTTPException(status_code=404, detail="Privitak nije pronađen")
        
        # Save to file
        safe_filename = re.sub(r'[^\w\-_\.]', '_', request.filename)
        file_path = INVOICES_DIR / f"{user['id']}_{request.transaction_id}_{safe_filename}"
        
        with open(file_path, 'wb') as f:
            f.write(attachment_data)
        
        # Update transaction
        await db.transactions.update_one(
            {"id": request.transaction_id, "user_id": user["id"]},
            {"$set": {
                "status": "downloaded",
                "invoice_filename": safe_filename,
                "invoice_path": str(file_path)
            }}
        )
        
        return {
            "success": True,
            "filename": safe_filename,
            "message": "Račun uspješno preuzet"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download attachment error: {e}")
        raise HTTPException(status_code=500, detail=f"Greška pri preuzimanju: {str(e)}")

@api_router.get("/email/test-connection")
async def test_email_connection(user: dict = Depends(get_current_user)):
    """Test Zoho Mail connection"""
    if not user.get("zoho_email") or not user.get("zoho_app_password"):
        raise HTTPException(
            status_code=400,
            detail="Zoho email nije konfiguriran."
        )
    
    try:
        mail_client = ZohoMailClient(user["zoho_email"], user["zoho_app_password"])
        mail_client.connect()
        mail_client.disconnect()
        return {"success": True, "message": "Uspješno povezano na Zoho Mail!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška pri povezivanju: {str(e)}")

class BatchSearchRequest(BaseModel):
    transaction_ids: List[str]

@api_router.post("/email/batch-search")
async def batch_search_emails(
    request: BatchSearchRequest,
    user: dict = Depends(get_current_user)
):
    """Search emails for multiple transactions at once"""
    if not user.get("zoho_email") or not user.get("zoho_app_password"):
        raise HTTPException(
            status_code=400,
            detail="Zoho email nije konfiguriran. Molimo konfigurirajte u postavkama."
        )
    
    # Get user's search settings
    date_range_days = user.get("date_range_days", 0)
    search_all_fields = user.get("search_all_fields", True)
    
    # Limit batch size to prevent timeout
    MAX_BATCH_SIZE = 15
    transaction_ids = request.transaction_ids[:MAX_BATCH_SIZE]
    
    if len(request.transaction_ids) > MAX_BATCH_SIZE:
        logger.warning(f"Batch search limited from {len(request.transaction_ids)} to {MAX_BATCH_SIZE}")
    
    # Get transactions
    transactions = await db.transactions.find(
        {"id": {"$in": transaction_ids}, "user_id": user["id"]},
        {"_id": 0}
    ).to_list(MAX_BATCH_SIZE)
    
    if not transactions:
        raise HTTPException(status_code=404, detail="Transakcije nisu pronađene")
    
    try:
        mail_client = ZohoMailClient(user["zoho_email"], user["zoho_app_password"])
        mail_client.connect()
        
        results = []
        for idx, trans in enumerate(transactions):
            try:
                # Parse date for search range
                date_str = trans.get("datum_izvrsenja", "")
                date_from = None
                date_to = None
                
                if date_str:
                    try:
                        from datetime import datetime, timedelta
                        # Handle various date formats
                        for fmt in ["%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"]:
                            try:
                                trans_date = datetime.strptime(date_str.strip(), fmt)
                                # Apply date range setting
                                date_from = (trans_date - timedelta(days=date_range_days)).strftime("%d-%b-%Y")
                                date_to = (trans_date + timedelta(days=date_range_days + 1)).strftime("%d-%b-%Y")
                                break
                            except:
                                continue
                    except:
                        pass
                
                # Build search terms from all relevant fields
                search_terms = []
                vendor_name = trans.get("primatelj", "").strip()
                
                if vendor_name:
                    search_terms.append(vendor_name)
                
                if search_all_fields:
                    # Add other fields to search
                    opis = trans.get("opis_transakcije", "").strip()
                    if opis and len(opis) > 3:
                        # Extract meaningful words from description
                        words = [w for w in opis.split() if len(w) > 3 and not w.replace('.', '').replace(',', '').isdigit()]
                        search_terms.extend(words[:3])  # Max 3 words from description
                
                if not search_terms:
                    results.append({
                        "transaction_id": trans["id"],
                        "vendor": vendor_name,
                        "date": date_str,
                        "found": False,
                        "emails": [],
                        "error": "Nema podataka za pretragu"
                    })
                    continue
                
                # Search for emails using all search terms
                all_emails = []
                seen_email_ids = set()
                
                for term in search_terms[:5]:  # Max 5 search terms
                    emails = mail_client.search_emails(
                        search_term=term,
                        date_from=date_from,
                        date_to=date_to
                    )
                    for e in emails:
                        if e["email_id"] not in seen_email_ids:
                            seen_email_ids.add(e["email_id"])
                            all_emails.append(e)
                
                # Get attachments for emails with PDF (limit to first 5 for performance)
                for email_result in all_emails[:5]:
                    attachments = mail_client.get_email_attachments(email_result["email_id"])
                    email_result["attachments"] = attachments
                    email_result["has_pdf"] = any(a.get("is_pdf") for a in attachments)
                
                # Filter to only emails with PDFs
                emails_with_pdf = [e for e in all_emails[:5] if e.get("has_pdf")]
                
                # Calculate confidence score for each email
                trans_date_parsed = None
                if date_str:
                    for fmt in ["%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"]:
                        try:
                            trans_date_parsed = datetime.strptime(date_str.strip(), fmt)
                            break
                        except:
                            continue
                
                for email_result in emails_with_pdf:
                    confidence = 50  # Base confidence
                    
                    # Check vendor name match in subject or from
                    email_subject = email_result.get("subject", "").lower()
                    email_from = email_result.get("from", "").lower()
                    vendor_lower = vendor_name.lower()
                    
                    if vendor_lower in email_subject:
                        confidence += 25
                    if vendor_lower in email_from:
                        confidence += 15
                    
                    # Check date proximity
                    email_date_str = email_result.get("date", "")
                    if email_date_str and trans_date_parsed:
                        try:
                            from email.utils import parsedate_to_datetime
                            email_date = parsedate_to_datetime(email_date_str)
                            days_diff = abs((email_date.date() - trans_date_parsed.date()).days)
                            
                            if days_diff == 0:
                                confidence += 10
                            elif days_diff <= 1:
                                confidence += 5
                            elif days_diff > 5:
                                confidence -= 10
                        except:
                            pass
                    
                    # Cap confidence at 95
                    email_result["confidence"] = min(95, max(10, confidence))
                
                # Sort by confidence (highest first)
                emails_with_pdf.sort(key=lambda x: x.get("confidence", 0), reverse=True)
                
                # Get best match
                best_match = emails_with_pdf[0] if emails_with_pdf else None
                best_confidence = best_match.get("confidence", 0) if best_match else 0
                
                # Auto-update transaction status if found
                if best_match and best_confidence >= 50:
                    await db.transactions.update_one(
                        {"id": trans["id"], "user_id": user["id"]},
                        {"$set": {
                            "status": "found",
                            "search_confidence": best_confidence,
                            "best_email_subject": best_match.get("subject", "")[:100]
                        }}
                    )
                else:
                    # Mark as not found
                    await db.transactions.update_one(
                        {"id": trans["id"], "user_id": user["id"]},
                        {"$set": {
                            "status": "manual",
                            "search_confidence": 0
                        }}
                    )
                
                results.append({
                    "transaction_id": trans["id"],
                    "vendor": vendor_name,
                    "date": date_str,
                    "search_terms": search_terms[:5],
                    "found": len(emails_with_pdf) > 0,
                    "confidence": best_confidence,
                    "emails": emails_with_pdf[:3],  # Limit to 3 results per transaction
                    "total_found": len(emails_with_pdf)
                })
                
            except Exception as trans_error:
                logger.error(f"Error searching for transaction {trans.get('id')}: {trans_error}")
                results.append({
                    "transaction_id": trans["id"],
                    "vendor": trans.get("primatelj", ""),
                    "date": trans.get("datum_izvrsenja", ""),
                    "found": False,
                    "emails": [],
                    "error": "Greška pri pretrazi"
                })
        
        mail_client.disconnect()
        
        found_count = sum(1 for r in results if r.get("found"))
        skipped = len(request.transaction_ids) - len(transaction_ids)
        
        return {
            "success": True,
            "total_transactions": len(results),
            "found_count": found_count,
            "skipped": skipped,
            "max_batch_size": MAX_BATCH_SIZE,
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch search error: {e}")
        raise HTTPException(status_code=500, detail=f"Greška pri pretraživanju: {str(e)}")

@api_router.get("/invoices/{transaction_id}/download")
async def download_invoice(transaction_id: str, user: dict = Depends(get_current_user)):
    """Download saved invoice file"""
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transakcija nije pronađena")
    
    invoice_path = transaction.get("invoice_path")
    if not invoice_path or not os.path.exists(invoice_path):
        raise HTTPException(status_code=404, detail="Račun nije pronađen")
    
    filename = transaction.get("invoice_filename", "racun.pdf")
    
    def file_iterator():
        with open(invoice_path, 'rb') as f:
            yield from f
    
    return StreamingResponse(
        file_iterator(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============== ZIP DOWNLOAD ==============

@api_router.get("/export/zip/{batch_id}")
async def export_zip(batch_id: str, user: dict = Depends(get_current_user)):
    """Download all invoices from a batch as ZIP"""
    transactions = await db.transactions.find(
        {
            "batch_id": batch_id, 
            "user_id": user["id"],
            "invoice_path": {"$exists": True, "$ne": None}
        },
        {"_id": 0}
    ).to_list(10000)
    
    if not transactions:
        raise HTTPException(status_code=404, detail="Nema preuzetih računa za download")
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for t in transactions:
            invoice_path = t.get("invoice_path")
            if invoice_path and os.path.exists(invoice_path):
                # Create a nice filename
                vendor_name = re.sub(r'[^\w\-_]', '_', t.get("primatelj", "unknown")[:30])
                date_str = t.get("datum_izvrsenja", "").replace("-", "")
                original_filename = t.get("invoice_filename", "racun.pdf")
                ext = os.path.splitext(original_filename)[1] or ".pdf"
                
                archive_filename = f"{date_str}_{vendor_name}{ext}"
                
                with open(invoice_path, 'rb') as f:
                    zip_file.writestr(archive_filename, f.read())
    
    zip_buffer.seek(0)
    
    # Get batch info for filename
    batch = await db.batches.find_one({"id": batch_id, "user_id": user["id"]}, {"_id": 0})
    batch_name = f"{batch['month']}_{batch['year']}" if batch else batch_id[:8]
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=racuni_{batch_name}.zip"}
    )

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "FinZen API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

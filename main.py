from fastapi import FastAPI,HTTPException ,Depends,APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from enum import Enum
from auth_utils import hash_password, verify_password, create_access_token
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import engine, Base, get_db
from models import UserModel, BusinessModel, TransactionModel
from datetime import date as pydate
import io
from fastapi.responses import StreamingResponse
import xlsxwriter
import csv
import pandas as pd
from fastapi.responses import StreamingResponse

from database import get_db
from models import TransactionModel, BusinessModel
from collections import defaultdict
from datetime import datetime


INDIA_STATE_REGISTRY = {
    "JAMMU AND KASHMIR":"01","HIMACHAL PRADESH":"02","PUNJAB":"03","CHANDIGARH":"04",
    "UTTARAKHAND":"05", "HARYANA":"06","DELHI":"07","RAJASTHAN":"08","UTTAR PRADESH":"09",
    "BIHAR":"10","SIKKIM":"11","ARUNACHAL PRADESH":"12","ASSAM":"18","WEST BENGAL":"19",
    "JHARKHAD":"20","ODISHA":"21","CHHATTISHGARH":"22","MADHYA PRADESH":"23","GUJARAT":"24",
    "DAMAN AND DIU":"25","DADRA AND NAGAR HAVELI":"26","MAHARASHTRA":"27","ARUNACHAL PRADESH":"28",
    "KARNATAKA":"29","GOA":"30","LAKSHADWEEP":"31","KERALA":"32","TAMIL NADU":"33",
    "PUDUCHERRY":"34","ANDAMAN AND NICOBAR ISLANDS":"35","TELANGANA":"36","ANDHRA PRADESH (NEW)":"37",
    "LADAKH":"38"
}

def normalize_and_state_code(state_input: str)-> str:
    clean_input = state_input.strip().upper()
    if "-" in clean_input:
        parts = clean_input.split("-")
        potential_code = parts[0].strip()
        if potential_code.isdigit() and len(potential_code) == 2:
            return potential_code

    if clean_input in INDIA_STATE_REGISTRY:
        return INDIA_STATE_REGISTRY[clean_input]

    if clean_input == "INTERNATIONAL":
        return "INT"

    return "UNKNOWN"

Base.metadata.create_all(bind = engine)

app=FastAPI(title="Digital Tax Filing support App")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class UserSignup(BaseModel):
    full_name:str
    email:str
    password:str

class UserLogin(BaseModel):
    email:str
    password:str

@app.get("/")
def home():
    return{"status":"Online","message":"Welcome To Your Digital Tax Filing Backend"}

@app.post("/register")
def register_user(user: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400,detail="Email already registered!")
    hashed = hash_password(user.password)
    db_user = UserModel(full_name = user.full_name, email = user.email, password_hash = hashed)
    db.add(db_user)
    db.commit()

    return {
        "success":True,
        "message":f"Account Successfully Created For {user.full_name}!"

    }
@app.post("/login")
def Login_User(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400,detail="Invalid Email or Password!")

    token=create_access_token(user_email=user.email)
    return {
        "login_status":"success",
        "access_token":token,
        "token_type":"bearer"
    }

class RegimeEnum(str,Enum):
    regular="REGULAR"
    compositiom="COMPOSITION"

class BusinessCreate(BaseModel):
    owner_email:str
    legal_name:str
    gstin:str
    home_state:str
    turnover_category:RegimeEnum

@app.post("/create-business")
def create_business(business:BusinessCreate, db: Session = Depends(get_db)):
    if len(business.gstin)!=15:
        return {"success":False,"error":"Invalid GSTIN! An Indian GSTIN must be exactly 15 characters long."}

    existing_business = db.query(BusinessModel).filter(
            func.lower(BusinessModel.owner_email) == func.lower(business.owner_email),
            func.lower(BusinessModel.legal_name) == func.lower(business.legal_name)
        ).first()
    if existing_business:
            # If this business name is already registered by this user, return the existing ID!
            print(f"🔄 Business '{business.legal_name}' already exists for this user. Routing to ID: {existing_business.id}")
            return {
                "success": True,
                "is_existing": True,  # Flag to let frontend know it's a redirect/re-sync
                "message": f"Switched to existing business workspace.",
                "business_id": existing_business.id,
                "home_state": existing_business.home_state
            }
        
    db_business = BusinessModel(
        owner_email = business.owner_email,
        legal_name = business.legal_name,
        gstin = business.gstin,
        home_state = business.home_state,
        turnover_category = business.turnover_category.value
    )
    db.add(db_business)
    db.commit()
    db.refresh(db_business)

    return{
        "success":True,
        "message":f"New Business '{business.legal_name}' saved to local database.",
        "business_id":db_business.id,
        "home_state":db_business.home_state
    }

class ScopeEnum(str,Enum):
    intrastate="INTRASTATE"
    interstate="INTERSTATE"
    international="INTERNATIONAL"

class TypeEnum(str,Enum):
    income="INCOME"
    expense="EXPENSE"


class TransactionInput(BaseModel):
    business_id:int
    transaction_type:TypeEnum
    product_name: str
    gross_amount:float
    discount:float=0.0
    extra_charges:float=0.0
    gst_rate:float
    place_of_supply: str
    date: str
    invoice_number: str = ""
    recipient_gstin: str = ""
    recipient_name: str = ""

    @field_validator('gst_rate')
    def validte_indian_tax_slabs(cls,value):
        legal_slabs=[0.0,5.0,12.0,18.0,28.0]
        if value not in legal_slabs:
            raise ValueError(f"Invalid GST Slab! You entered {value}%. Indian GST allows only 0%,5%,18%, or 28%.")
        return value

@app.post("/add-transaction-v2")
def add_transaction_v2(item: TransactionInput, db: Session = Depends(get_db)):
    biz = db.query(BusinessModel).filter(BusinessModel.id == item.business_id).first()
    business_home_code = normalize_and_state_code(biz.home_state)
    transaction_pos_code = normalize_and_state_code(item.place_of_supply)
    if not biz:
        raise HTTPException(status_code = 404, detail = "Business profile not found!")
    taxable_value = item.gross_amount - item.discount + item.extra_charges
    cgst,sgst,igst=0.0,0.0,0.0
    scope_result = ""

    if transaction_pos_code == "INT":
        scope_result = "INTERNATIONAL"
        if item.transaction_type == TypeEnum.income:
            summary = "International Export. Zero rated supply."
        else:
            igst = taxable_value*(item.gst_rate/100)
            summary = "International Import. 100% IGST under RCM."

    elif transaction_pos_code == business_home_code:
        scope_result = "INTRASTATE"
        total_gst=taxable_value*(item.gst_rate/100)
        cgst=total_gst/2
        sgst=total_gst/2
        summary=f"Local traade within {biz.home_state}. Split into CGST and SGST."
    else:
        scope_result = "INTERSTATE"
        igst=taxable_value*(item.gst_rate/100)
        summary="Interstate transaction"

    grand_total=round(taxable_value+cgst+sgst+igst,)
    db_tx = TransactionModel(
        business_id = item.business_id, transaction_type = item.transaction_type.value, product_name = item.product_name,
        date = item.date,
        gross_amount = item.gross_amount, discount = item.discount, extra_charges = item.extra_charges,
        gst_rate = item.gst_rate, place_of_supply = item.place_of_supply, calculated_scope = scope_result,
        taxable_value = taxable_value, cgst_amount = round(cgst,2), sgst_amount = round(sgst,2),
        igst_amount = round(igst,2), total_tax = round(cgst + sgst + igst,2), grand_total = round(taxable_value+cgst+sgst+igst,2),
        invoice_number=item.invoice_number,
        recipient_gstin=item.recipient_gstin,
        recipient_name=item.recipient_name,                   # Populates the 'gst_rate' database column constraint
              # Matches the Maharashtra operating location
    )
    db.add(db_tx)
    db.commit()
    return{"success":True, "summary": summary, "transaction_id":db_tx.id,
        "taxable_value": f"{taxable_value:.2f}",
        "cgst_amount": f"{cgst:.2f}",
        "sgst_amount": f"{sgst:.2f}",
        "igst_amount": f"{igst:.2f}",
        "grand_total": f"{grand_total:.2f}"
    }


PRODUCT_CATALOG={
    "laptop":{"hsn":"8471","gst_rate":18.0},
    "smartphone":{"hsn":"8517","gst_rate":18.0},
    "packaged_food":{"hsn":"2106","gst_rate":5.0},
    "milk":{"hsn":"0401","gst_rate":0.0},
    "software_service":{"hsn":"9983","gst_rate":18.0}
}
@app.get("/autofill-item")    
def autofill_item(product_name:str):
    query=product_name.lower().strip()
    if query in PRODUCT_CATALOG:
        return{
            "found":True,
            "product":product_name,
            "hsn_code":PRODUCT_CATALOG[query]["hsn"],
            "auto_gst_rate":PRODUCT_CATALOG[query]["gst_rate"]
        }
    else:
        return{
            "found":False,
            "message":"Product not in default catalog. Please enter tax rate manually.",
            "auto_gst_rate":18.0
        }

@app.get("/tax-summary")
def get_tax_summary(business_id: int, db: Session = Depends(get_db)):
    business_txs= db.query(TransactionModel).filter(TransactionModel.business_id == business_id).all()

    if not business_txs:
        return {
            "message":"No transaction found for this business yet.",
            "total_tax_owed":0.0
        }
    total_income=0.0
    total_expense=0.0
    total_cgst=0.0
    total_sgst=0.0
    total_igst=0.0

    for tx in business_txs:
        val = tx.taxable_value

        if tx.transaction_type == "INCOME":
            total_income += val
            total_cgst += tx.cgst_amount
            total_sgst += tx.sgst_amount
            total_igst += tx.igst_amount
        else:
            total_expense += val

    net_profit = total_income - total_expense
    total_gst_pool = total_cgst + total_sgst + total_igst
    return {
        "success":True,
        "business_id":business_id,
        "summary": {
            "total_income_sales": round(total_income,2),
            "total_expense_purchases": round(total_expense,2),
            "net_taxable_profit": round(net_profit,2),
            "tax_breakdown":{
                "cgst_owed": round(total_cgst,2),
                "sgst_owed": round(total_sgst,2),
                "igst_owed": round(total_igst,2),
                "total_gst_liability": round(total_gst_pool,2)
            }

        }
    }
@app.get("/get-user-business")
def get_user_business(email: str, db: Session = Depends(get_db)):
    # Look for any business matching the user's login email
    business = db.query(Business).filter(Business.owner_email == email).first()
    if business:
        return {
            "exists": True,
            "business_id": business.id,
            "home_state": business.home_state
        }
    return {"exists": False}

@app.get("/get-user-all-businesses")
def get_user_all_businesses(email: str, db: Session = Depends(get_db)):
    # 🔍 Fetch all business profile rows that match the owner's login email
    businesses = db.query(BusinessModel).filter(
        func.lower(BusinessModel.owner_email) == func.lower(email)
    ).all()
    
    # Return a clean list of objects containing just the ID and Name for the UI dropdown
    return {
        "success": True,
        "businesses": [
            {"id": b.id, "legal_name": b.legal_name, "home_state": b.home_state} 
            for b in businesses
        ]
    }

@app.get("/export-tax-excel")
def export_tax_excel(business_id: int, db: Session = Depends(get_db)):
    # 1. Fetch sales transactions sorted chronologically by date
    txs = db.query(TransactionModel).filter(
        TransactionModel.business_id == business_id,
        TransactionModel.transaction_type == "INCOME"  # GSTR-1 focuses specifically on outbound Sales/Income
    ).order_by(TransactionModel.date.asc()).all()
    
    business = db.query(BusinessModel).filter(BusinessModel.id == business_id).first()
    b_name = business.legal_name if business else f"Business_ID_{business_id}"

    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    worksheet = workbook.add_worksheet("GSTR-1 Sales Summary")

    # Presentation styling formats
    header_fmt = workbook.add_format({'bold': True, 'bg_color': '#0F4C81', 'font_color': 'white', 'border': 1, 'align': 'center'})
    cell_fmt = workbook.add_format({'border': 1, 'align': 'left'})
    num_fmt = workbook.add_format({'border': 1, 'num_format': '₹#,##0.00', 'align': 'right'})

    # Set appropriate column width sizes for clean readability
    worksheet.set_column('A:J', 18)

    # 2. Write Official Government Statutory Headers list
    headers = [
        "GSTIN of Recipient", "Receiver Name", "Invoice Number", 
        "Invoice Date", "Invoice Value", "Place Of Supply", 
        "Reverse Charge", "Tax Rate", "Taxable Value", "Integrated Tax (IGST)"
    ]
    for col_idx, text in enumerate(headers):
        worksheet.write(0, col_idx, text, header_fmt)

    # 3. Stream data rows matching the layout fields
    for row_idx, tx in enumerate(txs, start=1):
        # Calculate full invoice value (Taxable Value + CGST + SGST + IGST)
        cgst = getattr(tx, 'cgst_amount', 0.0) or 0.0
        sgst = getattr(tx, 'sgst_amount', 0.0) or 0.0
        igst = getattr(tx, 'igst_amount', 0.0) or 0.0
        taxable_val = getattr(tx, 'taxable_value', 0.0) or 0.0
        total_invoice_value = taxable_val + cgst + sgst + igst

        # If gstin field is missing, label it as standard consumer sale (B2C)
        gstin_display = tx.recipient_gstin if tx.recipient_gstin else "CONSUMER (B2C)"
        name_display = tx.recipient_name if tx.recipient_name else "UR-Customer"
        inv_num = tx.invoice_number if tx.invoice_number else f"INV-TEMP-{tx.id}"

        worksheet.write(row_idx, 0, gstin_display, cell_fmt)
        worksheet.write(row_idx, 1, name_display, cell_fmt)
        worksheet.write(row_idx, 2, inv_num, cell_fmt)
        worksheet.write(row_idx, 3, tx.date, cell_fmt)
        worksheet.write_number(row_idx, 4, total_invoice_value, num_fmt)
        worksheet.write(row_idx, 5, tx.place_of_supply, cell_fmt)
        worksheet.write(row_idx, 6, "N", cell_fmt)  # Default Reverse Charge to No
        worksheet.write(row_idx, 7, f"{tx.gst_rate}%", cell_fmt)
        worksheet.write_number(row_idx, 8, taxable_val, num_fmt)
        worksheet.write_number(row_idx, 9, igst, num_fmt)

    workbook.close()
    output.seek(0)

    clean_filename = f"{b_name.replace(' ', '_')}_GSTR1_Summary.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={clean_filename}"}
    )

# Pydantic schema structure to accept custom header mappings configuration
class CsvIngestPayload(BaseModel):
    business_id: int
    raw_csv_text: str
    transaction_type: str
    mappings: dict
    product_tax_map: dict = {}  # Example keys: {"product_name": "Item Description", "gross_amount": "Total Bill"}

@app.post("/parse-and-import-csv")
def parse_and_import_csv(payload: CsvIngestPayload, db: Session = Depends(get_db)):
    try:
        # Split data cleanly into individual line strings
        lines = payload.raw_csv_text.strip().split('\n')
        if len(lines) < 2:
            return {"success": False, "message": "The uploaded spreadsheet does not contain data rows."}

        # Safely parse the CSV layout rules using the internal engine reader
        reader = csv.reader(lines)
        headers = [h.strip() for h in next(reader)]
        
        maps = payload.mappings
        
        # 🟢 Check and map indices dynamically based on the dropdown selections
        try:
            idx_name = headers.index(maps.get('product_name')) if maps.get('product_name') in headers else None
            idx_price = headers.index(maps.get('gross_amount')) if maps.get('gross_amount') in headers else None
            idx_inv = headers.index(maps.get('invoice_number')) if maps.get('invoice_number') in headers else None
            idx_gstin = headers.index(maps.get('recipient_gstin')) if maps.get('recipient_gstin') in headers else None
            idx_gst_rate = headers.index(maps.get('gst_rate')) if maps.get('gst_rate') in headers else None
            
            # 🔍 AUTOMATIC SEARCH: Hunt for real client names and transaction dates inside your sheet
            idx_real_date = headers.index('Billing_Date') if 'Billing_Date' in headers else None
            idx_real_customer = headers.index('Customer_Name') if 'Customer_Name' in headers else None
            
            if idx_name is None or idx_price is None:
                return {"success": False, "message": "Critical columns missing from selected mapping layout attributes."}
                
        except ValueError as err:
            return {"success": False, "message": f"Mapping reference point mismatch: {str(err)}"}
        db_type = "EXPENSE" if str(payload.transaction_type).lower() == "purchase" else "INCOME"
        imported_count = 0
        
        # Process the rows sequentially
        for row in reader:
            if not row or len(row) <= max(idx_name, idx_price):
                continue
                
            try:
                prod_name = row[idx_name].strip()
                gross_amt = float(row[idx_price].strip().replace('₹', '').replace(',', ''))
                
                # Dynamic fallback assignment for optional structural columns
                inv_num = row[idx_inv].strip() if (idx_inv is not None and len(row) > idx_inv) else ""
                rcpt_gstin = row[idx_gstin].strip() if (idx_gstin is not None and len(row) > idx_gstin) else ""
                
                # 🚀 REAL EXTRACTIONS: Pull the actual fields directly from your dairy file dataset rows
                real_date = row[idx_real_date].strip() if idx_real_date is not None else "05-Oct-2026"
                real_customer = row[idx_real_customer].strip() if idx_real_customer is not None else "UR-Customer"
                row_tax_rate = 18.0
                idx_gst_rate = None
                gst_rate_key = maps.get('gst_rate') or 'gst_rate'
                if gst_rate_key in headers:
                    idx_gst_rate = headers.index(gst_rate_key)
                elif 'gst_rate' in headers:
                    idx_gst_rate = headers.index('gst_rate')
                elif 'GST_Rate' in headers:
                    idx_gst_rate = headers.index('GST_Rate')
                # 🧮 Automatic Tax Mathematical Splits (Assumes default 18% slab platform context)
                tax_slab = 18.0
                taxable_value = gross_amt / (1 + (tax_slab / 100))
                total_gst = gross_amt - taxable_value   
                
                cgst = total_gst / 2
                sgst = total_gst / 2
                igst = 0.0

                # Commit record dictionary safely down to SQLite database structures
                bulk_db_tx = TransactionModel(
                    business_id=payload.business_id,
                    transaction_type=db_type,
                    product_name=prod_name,
                    gross_amount=gross_amt,
                    discount=0.0,
                    extra_charges=0.0,
                    place_of_supply="MAHARASHTRA",
                    taxable_value=round(taxable_value, 2),
                    cgst_amount=round(cgst, 2),
                    sgst_amount=round(sgst, 2),
                    igst_amount=0.0,
                    date=real_date,
                    invoice_number=inv_num,
                    recipient_gstin=rcpt_gstin,
                    recipient_name=real_customer,
                    gst_rate=row_tax_rate,                      
                    calculated_scope="INTRA_STATE",         
                    total_tax=round(total_gst, 2),          
                    grand_total=gross_amt           
                )
                db.add(bulk_db_tx)
                imported_count += 1
            except Exception as db_error:
                # 📢 THIS LINE PRINTS THE EXACT SQLITE/DATABASE ERROR TO YOUR TERMUX LOGS!
                print(f"❌ Database Insertion Failed for row {imported_count + 1}: {str(db_error)}")
                continue  # Skip corrupt lines or summary dividers cleanly without breaking the entire run

        if imported_count > 0:
            db.commit()
            print(f"📦 Success! Injected {imported_count} rows cleanly into SQLite.")
            return {"success": True, "imported_count": imported_count}
        else:
            return {"success": False, "message": "All database row inserts failed validation checks."}
        
    except Exception as e:
        db.rollback()
        print(f"❌ Backend Parsing Exception Trace: {str(e)}")
        return {"success": False, "message": f"Server Core Processing Error: {str(e)}"}
        
router = APIRouter()

@app.get("/export-gstr2")
async def export_gstr2(business_id: int, db: Session = Depends(get_db)):
    # 1. Fetch your actual ledger entries from SQLite matching current constraints
    # Filters exclusively for inward investments/purchases for the active business profile
    records = db.query(TransactionModel).filter(
        TransactionModel.business_id == business_id,
        TransactionModel.transaction_type == "EXPENSE"  # Matches inward supply context
    ).all()
    
    if not records:
        raise HTTPException(
            status_code=404, 
            detail="No purchase ledger transactions found for this active business profile."
        )
        
    b2b_list = []
    b2c_list = []
    
    # 2. Iterate dynamically over every entry in your live database table
    for r in records:
        # Group variables to handle potential database Null types cleanly
        invoice_val = float(r.grand_total or r.gross_amount or 0.0)
        taxable_val = float(r.taxable_value or 0.0)
        cgst = float(r.cgst_amount or 0.0)
        sgst = float(r.sgst_amount or 0.0)
        igst = float(r.igst_amount or 0.0)
        
        # Determine sorting structure based on supplier tax identity presence
        supplier_gstin = str(r.recipient_gstin or "").strip()
        
        if supplier_gstin and supplier_gstin != "":
            # B2B Segment: Transactions with registered corporate vendors
            b2b_list.append({
                "Supplier GSTIN": supplier_gstin,
                "Invoice Number": r.invoice_number or "N/A",
                "Invoice Date": r.date or "N/A",  # Utilizes your fixed flexible mapping column
                "Invoice Value": invoice_val,
                "Taxable Value": taxable_val,
                "Central Tax (CGST)": cgst,
                "State Tax (SGST)": sgst,
                "Integrated Tax (IGST)": igst,
                "GST Rate (%)": float(r.gst_rate or 0.0),
                "ITC Eligibility": "Inputs"  # Statutory default categorization flag
            })
        else:
            # B2C Segment: Retail or unregistered consumer purchases
            b2c_list.append({
                "Place of Supply": r.place_of_supply or "Unspecified",
                "Invoice Date": r.date or "N/A",
                "Total Value": invoice_val,
                "Taxable Value": taxable_val,
                "Central Tax (CGST)": cgst,
                "State Tax (SGST)": sgst,
                "Integrated Tax (IGST)": igst,
                "GST Rate (%)": float(r.gst_rate or 0.0)
            })

    # 3. Construct uniform structurally isolated Pandas frames
    if b2b_list:
        df_b2b = pd.DataFrame(b2b_list)
    else:
        df_b2b = pd.DataFrame(columns=[
            "Supplier GSTIN", "Invoice Number", "Invoice Date", "Invoice Value", 
            "Taxable Value", "Central Tax (CGST)", "State Tax (SGST)", 
            "Integrated Tax (IGST)", "GST Rate (%)", "ITC Eligibility"
        ])

    if b2c_list:
        df_b2c = pd.DataFrame(b2c_list)
    else:
        df_b2c = pd.DataFrame(columns=[
            "Place of Supply", "Invoice Date", "Total Value", "Taxable Value", 
            "Central Tax (CGST)", "State Tax (SGST)", "Integrated Tax (IGST)", "GST Rate (%)"
        ])

    # 4. Stream data directly to memory buffer bypassing Termux storage read/write traps
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_b2b.to_excel(writer, sheet_name='B2B Invoices', index=False)
        df_b2c.to_excel(writer, sheet_name='B2C Purchases', index=False)
    output.seek(0)

    # 5. Build returning transport content metadata headers
    headers = {
        'Content-Disposition': f'attachment; filename=GSTR2_Report_Business_{business_id}.xlsx'
    }
    
    return StreamingResponse(
        output, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        headers=headers
    )

@app.get("/business-analytics-v1")
def get_business_analytics(business_id: int, db: Session = Depends(get_db)):
    # Fetch all transactions associated with this business profile workspace
    records = db.query(TransactionModel).filter(
        TransactionModel.business_id == business_id
    ).all()
    
    # Initialize metric collection data structures
    monthly_data_map = defaultdict(lambda: {"month": "", "sales": 0.0, "purchases": 0.0})
    slab_distribution = defaultdict(float)
    
    total_sales = 0.0
    total_purchases = 0.0
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0
    
    for r in records:
        gross_val = float(r.grand_total or r.gross_amount or 0.0)
        taxable_val = float(r.taxable_value or 0.0)
        cgst = float(r.cgst_amount or 0.0)
        sgst = float(r.sgst_amount or 0.0)
        igst = float(r.igst_amount or 0.0)

        tx_date_string = getattr(r, 'date', None) or getattr(r, 'custom_date_slug', None)
        # 1. Parse dates safely to compile chronological monthly performance buckets
        try:
            # Attempts to parse standard Indian tax ledger string dates (e.g., "10-Oct-2026")
            parsed_date = datetime.strptime(r.date.strip(), "%d-%b-%Y")
            month_key = parsed_date.strftime("%Y-%m")
            month_label = parsed_date.strftime("%b %Y")
        except Exception:
            month_key = "2026-10"
            month_label = "Oct 2026"
            
        monthly_data_map[month_key]["month"] = month_label
        
        # 2. Segment financial cash flows by dynamic database transaction type tags
        if r.transaction_type == "INCOME":
            total_sales += taxable_val
            total_cgst += cgst
            total_sgst += sgst
            total_igst += igst
            monthly_data_map[month_key]["sales"] += taxable_val
        elif r.transaction_type == "EXPENSE":
            total_purchases += taxable_val
            monthly_data_map[month_key]["purchases"] += taxable_val
            
        # 3. Track tax slab distributions
        slab_key = f"{int(r.gst_rate or 18)}%"
        slab_distribution[slab_key] += taxable_val

    # Format monthly dictionary objects into clean, ordered lists for Recharts consumption
    trend_charts_list = [monthly_data_map[k] for k in sorted(monthly_data_map.keys())]
    slab_charts_list = [{"name": k, "value": round(v, 2)} for k, v in slab_distribution.items()]
    
    return {
        "success": True,
        "summary": {
            "gross_sales": round(total_sales, 2),
            "gross_purchases": round(total_purchases, 2),
            "net_margin": round(total_sales - total_purchases, 2),
            "tax_breakdown": {
                "cgst_owed": round(total_cgst, 2),
                "sgst_owed": round(total_sgst, 2),
                "igst_owed": round(total_igst, 2),
                "total_liability": round(total_cgst + total_sgst + total_igst, 2)
            }
        },
        "trends": trend_charts_list,
        "slabs": slab_charts_list
    }

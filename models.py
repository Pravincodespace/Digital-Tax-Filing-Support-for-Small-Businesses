from sqlalchemy import Column, Integer, ForeignKey, Float, Boolean, String
from sqlalchemy.orm import relationship
from database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key = True, index = True)
    full_name = Column(String, nullable = False)
    email = Column(String, unique = True, index = True, nullable = False)
    password_hash = Column(String, nullable = False)

class BusinessModel(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key = True, index = True)
    owner_email = Column(String, ForeignKey("users.email"), nullable = False)
    legal_name = Column(String, nullable = False)
    gstin = Column(String, nullable= False)
    home_state = Column(String, nullable = False)
    turnover_category = Column(String, nullable = False)

class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key = True, index = True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable = False)
    transaction_type = Column(String, nullable = False)
    product_name =  Column(String, nullable=False)
    gross_amount = Column(Float, nullable = False)
    discount = Column(Float, default = 0.0)
    extra_charges = Column(Float, default = 0.0)
    gst_rate = Column(Float, nullable = False)
    

    place_of_supply = Column(String, nullable = False)
    calculated_scope = Column(String, nullable = False)

    taxable_value = Column(Float, nullable = False)
    cgst_amount = Column(Float, default = 0.0)
    sgst_amount = Column(Float, default = 0.0)
    igst_amount = Column(Float, default = 0.0)
    total_tax = Column(Float, default = 0.0)
    grand_total = Column(Float, default = 0.0)

    date = Column(String, index = True)

    invoice_number = Column(String, default="")
    recipient_gstin = Column(String, default="")
    recipient_name = Column(String, default="")

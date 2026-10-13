import jwt
from datetime import datetime,timedelta,timezone
from pwdlib import PasswordHash

pwd_context = PasswordHash.recommended()
SECRET_KEY="SUPER_SECRET_TAX_APP_CHANGE_THIS_LATER_PRA"
ALGORITHM="HS256"

def hash_password(password: str)->str:
    return pwd_context.hash(password)

def verify_password(plain_password:str,hashed_password:str)->bool:
    return pwd_context.verify(plain_password,hashed_password)

def create_access_token(user_email:str)->str:
    expire=datetime.now(timezone.utc)+timedelta(days=1)
    payload={
        "sub":user_email,
        "exp":expire
    }
    encoded_jwt=jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



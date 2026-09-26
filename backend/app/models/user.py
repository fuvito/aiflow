from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserProfile(BaseModel):
    id: str
    email: str
    access_status: str          # pending | approved | demo | disabled
    role: str                   # user | demo | admin
    must_change_password: bool = False
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None


class UsageToday(BaseModel):
    executions: int = 0
    llm_requests: int = 0
    max_executions: int = 0       # 0 = unlimited
    max_llm_requests: int = 0     # 0 = unlimited


class AccessRequest(BaseModel):
    id: str
    name: str
    email: str
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None
    status: str
    created_at: datetime

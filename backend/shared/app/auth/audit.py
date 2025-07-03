import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AdminAuditLog, User


class AuditService:
    """Service for logging admin actions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_action(
        self,
        user: User,
        action: str,
        resource_type: str,
        description: str,
        resource_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AdminAuditLog:
        """Log an admin action"""
        
        # Extract request details if available
        ip_address = None
        user_agent = None
        
        if request:
            # Get real IP address (considering proxies)
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            else:
                ip_address = getattr(request.client, "host", None)
            
            user_agent = request.headers.get("User-Agent")
        
        audit_log = AdminAuditLog(
            user_id=user.id,
            username=user.username,
            user_role=user.role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            extra_data=extra_data or {},
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow()
        )
        
        self.db.add(audit_log)
        await self.db.commit()
        await self.db.refresh(audit_log)
        
        return audit_log
    
    async def log_bulk_action(
        self, 
        user: User, 
        action: str,
        resource_type: str,
        resource_ids: list,
        description: str,
        request: Optional[Request] = None
    ):
        """Log bulk actions"""
        await self.log_action(
            user=user,
            action=f"BULK_{action}",
            resource_type=resource_type,
            description=description,
            extra_data={
                "resource_ids": resource_ids,
                "count": len(resource_ids)
            },
            request=request
        )
    
    async def log_tag_created(
        self, 
        user: User, 
        tag_id: str, 
        tag_name: str,
        request: Optional[Request] = None
    ):
        """Log tag creation"""
        await self.log_action(
            user=user,
            action="CREATE",
            resource_type="tag",
            resource_id=tag_id,
            description=f"Created tag: {tag_name}",
            extra_data={"tag_name": tag_name},
            request=request
        )
    
    async def log_company_created(
        self, 
        user: User, 
        company_id: str, 
        company_name: str,
        request: Optional[Request] = None
    ):
        """Log company creation"""
        await self.log_action(
            user=user,
            action="CREATE",
            resource_type="company",
            resource_id=company_id,
            description=f"Created company: {company_name}",
            extra_data={"company_name": company_name},
            request=request
        )
    
    async def log_user_role_changed(
        self, 
        admin_user: User,
        target_user_id: str,
        target_username: str,
        old_role: str,
        new_role: str,
        request: Optional[Request] = None
    ):
        """Log user role changes"""
        await self.log_action(
            user=admin_user,
            action="UPDATE",
            resource_type="user_role",
            resource_id=target_user_id,
            description=f"Changed role for user {target_username} from {old_role} to {new_role}",
            extra_data={
                "target_username": target_username,
                "old_role": old_role,
                "new_role": new_role
            },
            request=request
        ) 
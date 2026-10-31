from typing import Any, Dict, Optional
from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.fields = fields or {}

class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found", fields: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code="NOT_FOUND", message=message, fields=fields)

class BadRequestException(AppException):
    def __init__(self, message: str = "Invalid request", fields: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, code="BAD_REQUEST", message=message, fields=fields)

class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication required", fields: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, code="UNAUTHORIZED", message=message, fields=fields)

class ForbiddenException(AppException):
    def __init__(self, message: str = "Action forbidden", fields: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code="FORBIDDEN", message=message, fields=fields)

class ConflictException(AppException):
    def __init__(self, message: str = "Resource state conflict", fields: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code="STATE_CONFLICT", message=message, fields=fields)

import time
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.exceptions import AppException
from app.routers import (
    public,
    auth,
    users,
    products,
    plans,
    templates,
    taxes,
    discounts,
    subscriptions,
    invoices,
    payments,
    billing
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"]
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "fields": exc.fields
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    field_errors = {}
    for err in exc.errors():
        field_name = ".".join(str(loc) for loc in err["loc"] if loc not in ("body", "query", "path"))
        field_errors[field_name or "general"] = err["msg"]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "fields": field_errors
            }
        }
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "fields": {}
            }
        }
    )

app.include_router(public.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(plans.router, prefix=settings.API_V1_STR)
app.include_router(templates.router, prefix=settings.API_V1_STR)
app.include_router(taxes.router, prefix=settings.API_V1_STR)
app.include_router(discounts.router, prefix=settings.API_V1_STR)
app.include_router(subscriptions.router, prefix=settings.API_V1_STR)
app.include_router(invoices.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)

frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"

if frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(frontend_dir / "index.html")

    @app.get("/login.html")
    @app.get("/login")
    async def serve_login():
        return FileResponse(frontend_dir / "login.html")

    @app.get("/signup.html")
    @app.get("/signup")
    async def serve_signup():
        return FileResponse(frontend_dir / "signup.html")

    @app.get("/forgot-password.html")
    @app.get("/forgot-password")
    async def serve_forgot_password():
        return FileResponse(frontend_dir / "forgot-password.html")

    @app.get("/reset-password.html")
    @app.get("/reset-password")
    async def serve_reset_password():
        return FileResponse(frontend_dir / "reset-password.html")

    @app.get("/admin/{page_name}")
    async def serve_admin_page(page_name: str):
        target = frontend_dir / "admin" / f"{page_name}.html"
        if not target.exists():
            target = frontend_dir / "admin" / page_name
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(frontend_dir / "admin" / "dashboard.html")

    @app.get("/portal/{page_name}")
    async def serve_portal_page(page_name: str):
        target = frontend_dir / "portal" / f"{page_name}.html"
        if not target.exists():
            target = frontend_dir / "portal" / page_name
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(frontend_dir / "portal" / "my-subscriptions.html")

    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend_root")

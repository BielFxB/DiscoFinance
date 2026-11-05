import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.discord_bot import start_discord_bot, stop_discord_bot
from app.routers import (
    auth,
    categories,
    transactions,
    recurring,
    analytics,
    savings
)

# Configurar logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("financas.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação FastAPI:
    - Inicializa o bot do Discord em background
    - Fecha conexões e cancela tarefas no shutdown
    """
    logger.info("🚀 Iniciando DiscFinanci Backend (FastAPI)...")
    logger.info(f"Porta configurada: {settings.PORT} | Origens CORS: {settings.cors_origins_list}")
    
    # Inicia o bot do Discord de forma assíncrona
    await start_discord_bot()
    
    yield
    
    logger.info("🛑 Encerrando DiscFinanci Backend...")
    await stop_discord_bot()

app = FastAPI(
    title="DiscFinanci API",
    description="Backend de Finanças Pessoais Multi-usuário com Integração Discord Bot e Supabase",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS com suporte amplo para localhost, 127.0.0.1, IPs e domínios Cloudflare
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Garante que exceções não tratadas retornem resposta JSON padronizada com headers CORS."""
    logger.error(f"Erro na requisição {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Erro interno: {str(exc)}"}
    )

# Registrar Routers
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(recurring.router)
app.include_router(analytics.router)
app.include_router(savings.router)

@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "DiscFinanci API",
        "version": "1.0.0",
        "port": settings.PORT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)


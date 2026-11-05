import logging
from typing import Optional
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("financas.database")

_supabase_client: Optional[Client] = None
_last_url: Optional[str] = None
_last_key: Optional[str] = None

def get_supabase() -> Client:
    """
    Retorna o singleton da instância do cliente Supabase.
    Recria o cliente caso as credenciais no .env tenham sido atualizadas.
    """
    global _supabase_client, _last_url, _last_key
    url = settings.clean_supabase_url
    key = settings.clean_supabase_key

    if _supabase_client is None or url != _last_url or key != _last_key:
        if not url or not key or "placeholder" in url:
            logger.warning(
                "ATENÇÃO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env! "
                "Operações com o banco falharão até que sejam configuradas."
            )
        try:
            _supabase_client = create_client(
                url or "https://placeholder.supabase.co",
                key or "placeholder-key"
            )
            _last_url = url
            _last_key = key
            logger.info(f"Supabase Client inicializado com endpoint: {url or 'placeholder'}")
        except Exception as e:
            logger.error(f"Erro ao inicializar Supabase Client: {e}")
            raise
    return _supabase_client

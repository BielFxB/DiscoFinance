import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PORT: int = Field(default=8001, alias="PORT")
    HOST: str = Field(default="127.0.0.1", alias="HOST")
    CORS_ORIGINS: str = Field(
        default="http://localhost:3001,http://127.0.0.1:3001",
        alias="CORS_ORIGINS"
    )
    
    # Supabase
    SUPABASE_URL: str = Field(default="", alias="SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    
    # JWT
    JWT_SECRET: str = Field(default="dev-secret-super-key-change-in-prod-1234567890", alias="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", alias="JWT_ALGORITHM")
    JWT_EXPIRE_DAYS: int = Field(default=30, alias="JWT_EXPIRE_DAYS")
    
    # Discord Bot
    DISCORD_BOT_TOKEN: str = Field(default="", alias="DISCORD_BOT_TOKEN")

    @property
    def clean_supabase_url(self) -> str:
        return (self.SUPABASE_URL or "").strip()

    @property
    def clean_supabase_key(self) -> str:
        return (self.SUPABASE_SERVICE_ROLE_KEY or "").strip()

    @property
    def cors_origins_list(self) -> List[str]:
        default_origins = [
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]
        if not self.CORS_ORIGINS:
            return default_origins
        configured = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return list(set(default_origins + configured))

    class Config:
        env_file = (
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
            ".env"
        )
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()


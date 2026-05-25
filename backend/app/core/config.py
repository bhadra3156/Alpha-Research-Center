from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    groq_api_key: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    fmp_api_key: str = ""
    finnhub_api_key: str = ""
    sec_edgar_email: str = "research@alpharesearch.ai"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    backend_api_key: str = "alpharesearch_internal_key_2024"
    app_name: str = "AlphaResearch"
    debug: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
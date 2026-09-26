from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM
    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_base_url: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # Supabase (server-side only — never expose to frontend)
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Demo usage limits
    demo_max_executions_per_day: int = 10
    demo_max_llm_requests_per_day: int = 20

    # Approved user limits (0 = unlimited)
    approved_max_executions_per_day: int = 0
    approved_max_llm_requests_per_day: int = 0

    # Cloudflare Turnstile (leave empty to skip verification in dev)
    turnstile_secret_key: str = ""

    # Bootstrap: auto-promote this email to approved admin on startup
    admin_email: str = ""

    class Config:
        env_file = ".env"


settings = Settings()

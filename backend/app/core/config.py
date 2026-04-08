from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:4173"]'
    DEBUG: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            parsed = json.loads(self.CORS_ORIGINS)
            if isinstance(parsed, list):
                return [o.strip() for o in parsed]
        except (json.JSONDecodeError, ValueError):
            pass
        # Comma-separated fallback: "https://a.com,https://b.com"
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

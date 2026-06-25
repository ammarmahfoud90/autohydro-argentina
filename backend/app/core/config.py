from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    # Override via CORS_ORIGINS env var in production (Railway/Render dashboard).
    # Default allows all origins because this is a public calculator with no auth.
    CORS_ORIGINS: str = '["*"]'
    DEBUG: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            origins = json.loads(self.CORS_ORIGINS)
            if not isinstance(origins, list):
                raise ValueError("CORS_ORIGINS must be a JSON array")
            return [o.strip() for o in origins]
        except json.JSONDecodeError:
            raise ValueError(
                f"CORS_ORIGINS is not valid JSON: {self.CORS_ORIGINS}"
            )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

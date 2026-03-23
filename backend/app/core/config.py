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
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return [self.CORS_ORIGINS]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

"""
SIH26188 — Core System Configuration
Architecture Reference: Section 3.2, 3.3, 3.4, 6.2

Centralized Pydantic v2 BaseSettings configuration for air-gapped offline edge deployment,
model weights directories, calibrated Bayesian deadband thresholds, and API settings.
"""

import os
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application Metadata
    APP_NAME: str = "SIH26188 AI-Based Fake Identity & Document Screening System"
    APP_VERSION: str = "3.0.0"
    ENVIRONMENT: str = Field(default="development", description="development | production | staging")
    DEBUG: bool = False

    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Cross-Origin Resource Sharing (CORS)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "https://tauri.localhost",
    ]

    # Model Weights Directory (Defaults to high-speed external SSD /Volumes/issparsh/sih26188_models/)
    MODELS_DIR: Path = Path(os.getenv("SIH_MODELS_DIR", "/Volumes/issparsh/sih26188_models"))
    LOCAL_MODELS_FALLBACK: Path = Path(__file__).resolve().parent.parent.parent / "models"

    # Specific Model Checkpoint Filenames (Section 3.3)
    PPOCR_DET_MODEL: str = "ch_PP-OCRv4_det_infer.onnx"
    PPOCR_REC_DEV_MODEL: str = "devanagari_PP-OCRv4_rec.onnx"
    PPOCR_REC_LATIN_MODEL: str = "en_PP-OCRv4_rec_infer.onnx"
    OMNIMRZ_MODEL: str = "omnimrz_ppocr_v4.onnx"
    SCRFD_MODEL: str = "scrfd_10g_bnkps.onnx"
    ADAFACE_MODEL: str = "adaface_ir100_ms1mv2.onnx"
    MINIFASNET_2_7X_MODEL: str = "2.7_80x80_MiniFASNetV2.onnx"
    MINIFASNET_4_0X_MODEL: str = "4_0_0_80x80_MiniFASNet.onnx"
    DOCTAMPER_MODEL: str = "doctamper_fcn_r50.onnx"
    TRUFOR_MODEL: str = "trufor_general.pth.tar"
    QWEN_VL_MODEL: str = "qwen2.5-vl-3b-instruct-q4.gguf"

    # Static Data & PKI Paths (Section 2.4, 2.5)
    APP_DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"
    STAMP_REGISTRY_PATH: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent / "data" / "stamp_registry.json"
    )
    UIDAI_ROOT_CERT_PATH: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent / "data" / "uidai_root_cert.pem"
    )

    # Calibrated Operational & Forensic Thresholds (Section 2.3, 6.2)
    TAU_ADAPT: float = Field(default=0.18, description="DocForge adaptive tamper threshold")
    TAU_LIVE: float = Field(default=0.85, description="MiniFASNet liveness deadband threshold")
    TAU_STAMP: float = Field(default=0.20, description="Stamp anomaly deadband threshold")
    TAU_FACE: float = Field(default=0.70, description="Facial cosine distance deadband threshold")
    TAU_OCR: float = Field(default=0.82, description="PP-OCRv4 confidence gate for Tier-2 Qwen dispatch")
    TAU_FACE_MATCH: float = Field(default=0.35, description="AdaFace cosine match threshold")

    # Risk Scoring Thresholds (Section 6.4)
    RISK_GREEN_MAX: float = 30.0
    RISK_AMBER_MAX: float = 69.0
    RISK_PRIOR_LOG_ODDS: float = -3.8918  # ln(0.02 / 0.98) base fraud prior (2%)

    # Database & Cache (Production Edge Configuration)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://sih_user:sih_secure_pass@localhost:5432/sih26188")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    def get_model_path(self, model_filename: str) -> Path:
        """
        Resolves model file path by checking external SSD first, falling back to local backend/models.
        """
        primary_path = self.MODELS_DIR / model_filename
        if primary_path.exists():
            return primary_path
        fallback_path = self.LOCAL_MODELS_FALLBACK / model_filename
        return fallback_path


# Global Singleton Settings Instance
settings = Settings()

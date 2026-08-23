"""
SIH26188 — Structured Logging Configuration
Provides unified, high-performance structured logging with ISO timestamps,
log levels, execution telemetry, and audit formatting.
"""

import logging
import sys
from typing import Any, Dict


class StructuredFormatter(logging.Formatter):
    """
    Formats log records with ISO-8601 timestamps and structured key-value tags.
    """

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, self.datefmt or "%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(8)
        message = record.getMessage()

        # Format custom extra fields if provided
        extra_fields: Dict[str, Any] = {}
        for key, value in record.__dict__.items():
            if key not in (
                "args", "asctime", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "module", "msecs",
                "message", "msg", "name", "pathname", "process", "processName",
                "relativeCreated", "stack_info", "thread", "threadName"
            ):
                extra_fields[key] = value

        extras_str = f" | {extra_fields}" if extra_fields else ""
        return f"[{timestamp}] [{level}] [{record.name}] {message}{extras_str}"


def setup_logging(level: int = logging.INFO) -> None:
    """
    Initializes root logger with structured formatter to stdout.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers if already configured
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = StructuredFormatter(datefmt="%Y-%m-%dT%H:%M:%S%z")
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)

    # Set third-party loggers to reasonable levels
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """
    Factory function for obtaining a named logger.
    """
    return logging.getLogger(name)

"""
SIH26188 — Application Services Architecture Layer
Provides domain service coordination between HTTP routers and algorithmic modules.
"""

from app.core.device_tracker import device_tracker

__all__ = ["device_tracker"]

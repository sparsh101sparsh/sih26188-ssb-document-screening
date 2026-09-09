"""
Global Pytest Configuration and Database State Isolation Fixtures
"""
import pytest
from app.core.device_tracker import device_tracker
from app.api.routers.companion import companion_store

@pytest.fixture(autouse=True)
def isolate_test_database_state():
    """Automatically clean in-memory registries and SQLite stores before and after each test."""
    device_tracker.clear()
    try:
        companion_store.reset(hard=True)
    except Exception:
        pass
    yield
    device_tracker.clear()
    try:
        companion_store.reset(hard=True)
    except Exception:
        pass

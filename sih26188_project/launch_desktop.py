#!/usr/bin/env python3
"""
Sashastra Seema Bal — Sovereign Border Document Screening & Biometric Terminal
Desktop Application Master Launcher
Starts the air-gapped Edge AI backend (FastAPI) and launches the native Electron Desktop Window.
"""

import os
import sys
import time
import subprocess
import signal
import urllib.request

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

def is_backend_running(port=8000):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/v1/health", timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False

def main():
    print("=" * 70)
    print("  SASHASTRA SEEMA BAL — SOVEREIGN IMMIGRATION & SCREENING DESKTOP")
    print("  Ministry of Home Affairs • Government of India")
    print("=" * 70)

    backend_proc = None
    if not is_backend_running(8000):
        print("\n[*] Starting Edge AI Defense Gateway on port 8000...")
        venv_python = os.path.join(PROJECT_ROOT, ".venv311", "bin", "python")
        if not os.path.exists(venv_python):
            venv_python = sys.executable

        backend_proc = subprocess.Popen(
            [venv_python, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=BACKEND_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("[+] Backend process spawned (PID: {})".format(backend_proc.pid))
        
        # Wait for backend readiness
        for _ in range(30):
            if is_backend_running(8000):
                print("[✓] Edge AI Backend is online and ready.")
                break
            time.sleep(0.3)
    else:
        print("[✓] Detected active Edge AI Backend on port 8000.")

    # Launch Electron Desktop App
    print("\n[*] Launching SSB Native Desktop Terminal Window...")
    try:
        electron_proc = subprocess.Popen(
            ["npx", "electron", "."],
            cwd=FRONTEND_DIR
        )
        electron_proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if backend_proc:
            print("\n[*] Shutting down Edge AI Backend...")
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                backend_proc.kill()
        print("[✓] Desktop session concluded safely.")

if __name__ == "__main__":
    main()

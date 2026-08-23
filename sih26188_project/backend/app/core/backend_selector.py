"""
SIH26188 — Dynamic Hardware & Machine Learning Execution Provider Selector
Architecture Reference: Section 3.5 (Dual Deployment Specification)

Detects Apple Silicon CoreML/MPS for macOS development environment,
TensorRT/CUDA for production Linux edge checkpoints (RTX 4060 / Jetson Orin),
and provides deterministic CPU fallback.
"""

import platform
from typing import List


def get_optimal_execution_providers() -> List[str]:
    """
    Dynamically configure optimal ONNX Runtime execution providers based on detected hardware.
    
    Returns:
        List[str]: Ordered priority list of ONNX Runtime execution providers.
    """
    try:
        import onnxruntime as ort
        available = ort.get_available_providers()
    except ImportError:
        return ["CPUExecutionProvider"]
    except Exception:
        return ["CPUExecutionProvider"]

    providers: List[str] = []

    # Linux NVIDIA GPU Target (Production Edge / Jetson Orin)
    if "TensorrtExecutionProvider" in available:
        providers.append("TensorrtExecutionProvider")
    if "CUDAExecutionProvider" in available:
        providers.append("CUDAExecutionProvider")

    # Apple Silicon M4 Development Environment (macOS Darwin arm64)
    is_apple_silicon = (
        platform.system() == "Darwin"
        and (platform.processor() == "arm" or platform.machine() in ("arm64", "aarch64"))
    )
    if is_apple_silicon and "CoreMLExecutionProvider" in available:
        providers.append("CoreMLExecutionProvider")

    # Universal CPU Fallback
    if "CPUExecutionProvider" in available:
        providers.append("CPUExecutionProvider")
    elif not providers:
        providers.append("CPUExecutionProvider")

    return providers


def get_torch_device():
    """
    Select accelerated PyTorch device for non-ONNX models (e.g., TruFor PyTorch/MPS runner).
    
    Returns:
        torch.device: cuda, mps, or cpu device instance.
    """
    try:
        import torch
        if torch.cuda.is_available():
            return torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    except ImportError:
        return "cpu"


def get_hardware_status() -> dict:
    """
    Provides structured hardware and runtime telemetry for health checks.
    
    Returns:
        dict: Summary of active platform, providers, and accelerator devices.
    """
    return {
        "platform": platform.system(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "onnx_providers": get_optimal_execution_providers(),
        "torch_device": str(get_torch_device()),
    }

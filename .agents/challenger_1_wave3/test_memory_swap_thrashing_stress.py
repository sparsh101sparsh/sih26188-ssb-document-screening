"""
Adversarial Memory & Swap Thrashing Stress Test Suite
Models exact RAM allocation on Apple Silicon M4 (16.0 GB Unified Memory).
Evaluates swap thrashing risk under various architectural configurations.
"""

import sys

TOTAL_RAM_MB = 16.0 * 1024.0 # 16384.0 MB

# System & Application base memory costs (MB)
BASE_MEMORY_COSTS = {
    "macos_core_os_windowserver": 3800.0,
    "tauri_native_shell_wkwebview": 450.0,
    "fastapi_single_worker_base": 350.0,
    "scientific_libs_overhead": 500.0,
}

# Model static memory footprint (Pinned in RAM/VRAM)
MODEL_WEIGHTS_MB = {
    "pp_ocrv4_det_rec": 110.0,
    "omnimrz_engine": 45.0,
    "scrfd_10gf_face": 25.0,
    "adaface_resnet100": 180.0,
    "minifasnet_dual_scale": 15.0,
    "doctamper_dtd_r50": 160.0,
    "trufor_transformer_mps": 320.0,
    "stamp_verifier_opencv": 65.0,
}

# Optional / Tier-2 Models
TIER2_MODELS_MB = {
    "qwen2_5_vl_3b_int4": 2800.0, # Weights + KV Cache
}

# Dynamic working memory per concurrent active scan request
DYNAMIC_BUFFER_PER_REQUEST_MB = {
    "rectified_image_arrays_1024x1024": 48.0, # RGB + BGR + Gray + CLAHE float32
    "intermediate_feature_maps": 220.0,       # TruFor + DocTamper + AdaFace activations
    "forensic_heatmap_buffers": 64.0,         # Turbo colormap + alpha blending canvas
    "session_state_json_payloads": 8.0,
}

def calculate_memory_profile(
    uvicorn_workers=1,
    concurrent_requests=1,
    qwen_loaded=True,
    docker_mode=False
):
    # 1. Base OS & Shell
    os_mem = BASE_MEMORY_COSTS["macos_core_os_windowserver"]
    shell_mem = BASE_MEMORY_COSTS["tauri_native_shell_wkwebview"]
    
    # 2. Docker overhead if running on macOS
    docker_hypervisor_mem = 4500.0 if docker_mode else 0.0
    
    # 3. FastAPI Python Backend
    # If multi-worker, each worker has separate Python runtime + libraries + model copies
    backend_base_per_worker = BASE_MEMORY_COSTS["fastapi_single_worker_base"] + BASE_MEMORY_COSTS["scientific_libs_overhead"]
    backend_total = backend_base_per_worker * uvicorn_workers
    
    # 4. Synchronous Model Weights
    # If single worker: shared in-process singletons. If multi-worker: duplicated per process!
    sync_models_single = sum(MODEL_WEIGHTS_MB.values())
    sync_models_total = sync_models_single * uvicorn_workers
    
    # 5. Tier-2 Model Weights (Qwen2.5-VL)
    tier2_single = TIER2_MODELS_MB["qwen2_5_vl_3b_int4"] if qwen_loaded else 0.0
    # In proper architecture, Qwen is hosted in a single dedicated background worker or lazy loaded
    tier2_total = tier2_single
    
    # 6. Dynamic Request Buffers
    dynamic_per_req = sum(DYNAMIC_BUFFER_PER_REQUEST_MB.values())
    dynamic_total = dynamic_per_req * concurrent_requests
    
    # Total RAM utilized
    total_utilized_mb = os_mem + shell_mem + docker_hypervisor_mem + backend_total + sync_models_total + tier2_total + dynamic_total
    total_utilized_gb = total_utilized_mb / 1024.0
    
    headroom_mb = TOTAL_RAM_MB - total_utilized_mb
    headroom_gb = headroom_mb / 1024.0
    utilization_pct = (total_utilized_mb / TOTAL_RAM_MB) * 100.0
    
    swap_risk = "SAFE (Zero Swap)"
    if headroom_mb < 1500.0:
        swap_risk = "CRITICAL (Severe Swap Thrashing & SSD Degradation)"
    elif headroom_mb < 3000.0:
        swap_risk = "MODERATE (Kernel Compressed Memory Active)"
        
    return {
        "uvicorn_workers": uvicorn_workers,
        "concurrent_requests": concurrent_requests,
        "qwen_loaded": qwen_loaded,
        "docker_mode": docker_mode,
        "total_mb": round(total_utilized_mb, 1),
        "total_gb": round(total_utilized_gb, 2),
        "headroom_gb": round(headroom_gb, 2),
        "utilization_pct": round(utilization_pct, 1),
        "swap_risk": swap_risk,
        "breakdown": {
            "os_windowserver_gb": round(os_mem / 1024.0, 2),
            "tauri_shell_gb": round(shell_mem / 1024.0, 2),
            "docker_vm_gb": round(docker_hypervisor_mem / 1024.0, 2),
            "backend_runtimes_gb": round(backend_total / 1024.0, 2),
            "sync_models_gb": round(sync_models_total / 1024.0, 2),
            "tier2_qwen_gb": round(tier2_total / 1024.0, 2),
            "dynamic_buffers_gb": round(dynamic_total / 1024.0, 2),
        }
    }

def run_memory_stress_suite():
    print("================================================================================")
    print(" ADVERSARIAL MEMORY & SWAP THRASHING STRESS TEST (16.0 GB M4 MAC)")
    print("================================================================================")
    
    scenarios = [
        # (workers, concurrent_reqs, qwen_loaded, docker_mode, description)
        (1, 1, True, False, "Architecture Nominal: 1 Worker, Native Tauri, 1 Active Scan, Qwen Pinned"),
        (1, 4, True, False, "High Concurrency: 1 Worker, Native Tauri, 4 Concurrent Scans, Qwen Pinned"),
        (1, 8, True, False, "Peak Burst: 1 Worker, Native Tauri, 8 Concurrent Scans, Qwen Pinned"),
        (1, 1, False, False, "Lean MVP: 1 Worker, Native Tauri, Qwen Lazy Loaded (Unloaded by default)"),
        
        # Adversarial / Anti-Pattern Configurations
        (4, 1, True, False, "ANTI-PATTERN 1: Multi-Process Uvicorn (--workers 4) on 16GB Mac"),
        (1, 1, True, True,  "ANTI-PATTERN 2: Docker Compose Running on 16GB macOS M4 (Hypervisor VM)"),
        (4, 4, True, True,  "ANTI-PATTERN 3: Docker Compose + 4 Workers on 16GB macOS M4 (Worst Case)"),
    ]
    
    for workers, reqs, qwen, docker, desc in scenarios:
        res = calculate_memory_profile(workers, reqs, qwen, docker)
        print(f"\nScenario: {desc}")
        print(f"  Configuration: Workers={workers} | ReqConcurrency={reqs} | Qwen={qwen} | Docker={docker}")
        print(f"  Total RAM Utilized: {res['total_gb']} GB / 16.00 GB ({res['utilization_pct']}%)")
        print(f"  Free Headroom: {res['headroom_gb']} GB")
        print(f"  Swap Risk Assessment: {res['swap_risk']}")
        print(f"  Breakdown (GB): OS={res['breakdown']['os_windowserver_gb']} | Shell={res['breakdown']['tauri_shell_gb']} | Docker={res['breakdown']['docker_vm_gb']} | Backend={res['breakdown']['backend_runtimes_gb']} | Models={res['breakdown']['sync_models_gb']} | Qwen={res['breakdown']['tier2_qwen_gb']} | Buffers={res['breakdown']['dynamic_buffers_gb']}")

if __name__ == "__main__":
    run_memory_stress_suite()

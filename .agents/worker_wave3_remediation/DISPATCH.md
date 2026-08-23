## 2026-08-22T20:33:31Z

You are the Remediation Worker for SIH26188 Wave 3 Deliverables.

Working Directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_wave3_remediation/
Original Request: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You must remediate all specific findings raised in the Phase 4 gate review across the 6 deliverables in `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/`:

1. In `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md`:
   - Section 3.5: Add complete, exact `torch.onnx.export` scripts with `opset_version=18` and dynamic axes specifications for PP-OCRv4 recognition, AdaFace-R100, and DocTamper.
   - Section 6.2: Update the Bayesian Log-Odds Risk Scoring Formula with noise deadbanding ($\max(0, s - \tau_{adapt})$ with $\tau_{adapt}=0.18$, $\tau_{live}=0.85$, $\tau_{stamp}=0.20$), explicit ingestion of CV-01 and CV-02 penalty weights ($w_{cv1}=3.5, w_{cv2}=4.0$), and calibrated baselines preventing false positive alarms on authentic documents with sensor noise.
   - Section 6.3: Update CV-06 to threshold against continuous float probability maps ($\tau_{adapt}=0.18$).
   - Section 3.2: Fix package name from `onnxruntime-silicon` to `onnxruntime==1.20.1`.

2. In `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/01_CHANGE_LOG_AND_ANALYSIS.md`:
   - Clarify M4 RAM headroom math: 6.02 GB baseline leaves 9.98 GB headroom; peak 10.02 GB leaves 5.98 GB headroom.

3. In `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/02_DEPLOYMENT_ENVIRONMENTS.md`:
   - Update `get_optimal_execution_providers()` in Python script to include `TensorrtExecutionProvider` and `CUDAExecutionProvider` alongside CoreML and CPU.
   - Add an itemized RTX 4060 8GB GDDR6 VRAM allocation breakdown table.

4. In `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/03_DESKTOP_APP_ARCHITECTURE.md`:
   - Add `use tauri::Emitter;` trait import in Rust code.
   - Implement robust sidecar child process management: store `child` in an `Arc<tokio::sync::Mutex<Option<CommandChild>>>` in Tauri state via `app.manage(...)`, and in `RunEvent::ExitRequested` acquire lock and call `child.kill().await` with clean SIGTERM/SIGKILL teardown.
   - Add dynamic port scanning fallback logic and exact PyInstaller `--onedir` script & `tauri.conf.json` external binary configuration.
   - Add concrete Pydantic v2 classes (`BaseModel`, `ConfigDict`, `field_validator`) and include the missing `/api/v1/audit/logs` endpoint schema.

5. In `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/04_STAMP_AUTHENTICATION_MODULE.md`:
   - Fix `verify_stamp()`: replace `context_mismatch = 0.0` with genuine ISO date parsing comparing `permit_window[0] <= ocr_date <= permit_window[1]`.
   - Implement multi-ink HSV segmentation for purple, red (`[0,50,50]-[10,255,255]` & `[170,50,50]-[180,255,255]`), blue (`[100,50,50]-[130,255,255]`), and dark/black ink.
   - Implement SIFT/ORB feature matching with `cv2.findHomography` and `cv2.warpPerspective` prior to `ssim()`.
   - Handle unknown checkposts with AMBER investigation flag rather than silent green bypass.

6. In `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/android-agent/MASTER_PROMPT.md`:
   - Add the `/api/v1/audit/logs` endpoint schema and Pydantic models.
   - Add `live_face_blob` column to SQLite outbox DDL and ensure non-MRZ fields are explicitly `Optional[T] = None`.
   - Provide genuine SHA-256 hash computation logic.

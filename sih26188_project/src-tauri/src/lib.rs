use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

fn is_backend_alive() -> bool {
    if let Ok(addr) = "127.0.0.1:8000".parse::<SocketAddr>() {
        TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok()
    } else {
        false
    }
}

fn spawn_backend_process() -> bool {
    if is_backend_alive() {
        return true;
    }

    let backend_dir = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend";
    let venv_python = PathBuf::from(backend_dir).join(".venv311/bin/python");
    let fallback_venv = PathBuf::from(backend_dir).join(".venv/bin/python");

    let python_bin = if venv_python.exists() {
        venv_python
    } else if fallback_venv.exists() {
        fallback_venv
    } else {
        PathBuf::from("python3")
    };

    let child = Command::new(python_bin)
        .current_dir(backend_dir)
        .args(&["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();

    child.is_ok()
}

fn setup_adb_reverse() {
    let adb_candidates = [
        "/opt/homebrew/bin/adb",
        "/usr/local/bin/adb",
        "/usr/bin/adb",
        "adb",
    ];
    for &candidate in &adb_candidates {
        if let Ok(mut child) = Command::new(candidate)
            .args(&["reverse", "tcp:8000", "tcp:8000"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            let _ = child.wait();
            break;
        }
    }
}

#[tauri::command]
fn start_backend() -> Result<String, String> {
    if is_backend_alive() {
        setup_adb_reverse();
        return Ok("Backend edge server is already active on 0.0.0.0:8000".to_string());
    }

    if spawn_backend_process() {
        for _ in 0..15 {
            std::thread::sleep(Duration::from_millis(200));
            if is_backend_alive() {
                setup_adb_reverse();
                return Ok("Backend server started successfully on 0.0.0.0:8000".to_string());
            }
        }
        setup_adb_reverse();
        Ok("Backend process spawned; starting up...".to_string())
    } else {
        Err("Could not spawn Python backend. Please ensure Python is installed.".to_string())
    }
}

#[tauri::command]
fn trigger_adb_reverse() -> Result<String, String> {
    let adb_candidates = [
        "/opt/homebrew/bin/adb",
        "/usr/local/bin/adb",
        "/usr/bin/adb",
        "adb",
    ];
    for &candidate in &adb_candidates {
        if let Ok(mut child) = Command::new(candidate)
            .args(&["reverse", "tcp:8000", "tcp:8000"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            let _ = child.wait();
            return Ok("USB reverse tunnel established via adb reverse tcp:8000 tcp:8000".to_string());
        }
    }
    Err("Could not find or execute adb executable on system".to_string())
}

#[tauri::command]
fn get_api_url() -> String {
    "http://localhost:8000".to_string()
}

pub fn run() {
    // Backend process is not spawned automatically at startup,
    // allowing on-demand launch from the UI via the start_backend command.
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_api_url, start_backend, trigger_adb_reverse])
        .run(tauri::generate_context!())
        .expect("error while running SSB Screening app");
}

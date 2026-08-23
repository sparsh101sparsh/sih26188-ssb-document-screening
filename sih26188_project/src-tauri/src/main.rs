// SIH26188 — Tauri 2.0 Main Entry Point
// Launches the React frontend and manages the FastAPI sidecar process.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ssb_screening_lib::run()
}

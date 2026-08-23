#[tauri::command]
fn get_api_url() -> String {
    "http://localhost:8000".to_string()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_api_url])
        .run(tauri::generate_context!())
        .expect("error while running SSB Screening app");
}

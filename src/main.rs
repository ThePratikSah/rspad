use axum::{
    Router,
    extract::Json,
    http::{StatusCode, Uri, header},
    response::IntoResponse,
    routing::post,
};
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::net::SocketAddr;
use std::path::Path;
use std::process::Stdio;
use std::time::Duration;
use tempfile::Builder;
use tokio::net::TcpListener;
use tokio::process::Command;
use tokio::time::timeout;

// Embed the frontend folder directly into the binary at compile time
#[derive(RustEmbed)]
#[folder = "frontend"]
struct Assets;

#[derive(Deserialize)]
struct RunRequest {
    code: String,
}

#[derive(Serialize)]
struct RunResponse {
    success: bool,
    output: String,
}

async fn bind_available_port(
    start_port: u16,
    max_attempts: u16,
) -> Result<(TcpListener, u16), String> {
    for port in start_port..(start_port + max_attempts) {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        if let Ok(listener) = TcpListener::bind(addr).await {
            return Ok((listener, port));
        }
    }
    Err(format!(
        "Could not find an open port in range {}-{}",
        start_port,
        start_port + max_attempts - 1
    ))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/run", post(handle_run))
        .fallback(static_handler);

    let port = 7878;
    let (listener, port) = bind_available_port(port, 20)
        .await
        .expect("Failed to bind to any available local port");

    let url = format!("http://localhost:{}", port);
    println!("⚡ RustPad running at {}", url);

    // Optional: auto-open the browser on launch
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open")
        .arg(format!("http://localhost:{}", port))
        .spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open")
        .arg(format!("http://localhost:{}", port))
        .spawn();
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", &format!("http://localhost:{}", port)])
        .spawn();

    axum::serve(listener, app).await.unwrap();
}

// ---------------- EXECUTION LOGIC ----------------
async fn handle_run(Json(payload): Json<RunRequest>) -> Json<RunResponse> {
    let result = execute_rust_code(payload.code).await;
    match result {
        Ok(res) => Json(res),
        Err(err) => Json(RunResponse {
            success: false,
            output: format!("Internal Error: {}", err),
        }),
    }
}

async fn execute_rust_code(code: String) -> Result<RunResponse, String> {
    let temp_dir = Builder::new()
        .prefix("rustpad_")
        .tempdir()
        .map_err(|e| e.to_string())?;

    let src_file = temp_dir.path().join("main.rs");
    let bin_file = temp_dir.path().join("main_bin");

    fs::write(&src_file, code).map_err(|e| e.to_string())?;

    // Resolve rustc path (especially for ~/.cargo/bin on Unix)
    let home = env::var("HOME").unwrap_or_default();
    let default_rustc = format!("{}/.cargo/bin/rustc", home);
    let compiler = if Path::new(&default_rustc).exists() {
        default_rustc
    } else {
        "rustc".to_string()
    };

    // 1. Compile
    let compile_output = Command::new(&compiler)
        .arg(&src_file)
        .arg("-o")
        .arg(&bin_file)
        .output()
        .await
        .map_err(|e| format!("Failed to invoke rustc: {}. Is Rust installed?", e))?;

    if !compile_output.status.success() {
        return Ok(RunResponse {
            success: false,
            output: String::from_utf8_lossy(&compile_output.stderr).to_string(),
        });
    }

    // 2. Run with a 10-second timeout to handle infinite loops safely
    let child = Command::new(&bin_file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to execute binary: {}", e))?;

    match timeout(Duration::from_secs(10), child.wait_with_output()).await {
        Ok(Ok(run_output)) => {
            let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();

            let output = if !stderr.is_empty() {
                format!("{}\n[Stderr / Panic]:\n{}", stdout, stderr)
            } else {
                stdout
            };

            Ok(RunResponse {
                success: run_output.status.success(),
                output,
            })
        }
        Ok(Err(e)) => Err(format!("Runtime error: {}", e)),
        Err(_) => Ok(RunResponse {
            success: false,
            output: "Execution timed out (10s limit exceeded).".to_string(),
        }),
    }
}

// ---------------- EMBEDDED ASSETS HANDLER ----------------
async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => (StatusCode::NOT_FOUND, "404 Not Found").into_response(),
    }
}

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::{Duration, Instant};

#[derive(Debug, Deserialize)]
pub struct HeaderEntry {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<HeaderEntry>,
    pub body: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HttpConfig {
    pub timeout_ms: Option<u64>,
    pub proxy_url: Option<String>,
    pub verify_ssl: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u64,
    pub size_bytes: u64,
}

pub async fn execute_request(
    request: HttpRequest,
    config: Option<HttpConfig>,
) -> Result<HttpResponse, String> {
    let mut builder = reqwest::Client::builder();

    if let Some(ref cfg) = config {
        if let Some(timeout_ms) = cfg.timeout_ms {
            builder = builder.timeout(Duration::from_millis(timeout_ms));
        }
        if let Some(ref proxy_url) = cfg.proxy_url {
            if !proxy_url.is_empty() {
                let proxy = reqwest::Proxy::all(proxy_url)
                    .map_err(|e| format!("Invalid proxy URL: {}", e))?;
                builder = builder.proxy(proxy);
            }
        }
        if let Some(verify_ssl) = cfg.verify_ssl {
            builder = builder.danger_accept_invalid_certs(!verify_ssl);
        }
    }

    let client = builder
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let method = Method::from_str(&request.method.to_uppercase())
        .map_err(|e| format!("Invalid HTTP method '{}': {}", request.method, e))?;

    let mut header_map = HeaderMap::new();
    for entry in &request.headers {
        if !entry.enabled || entry.key.is_empty() {
            continue;
        }
        let name = HeaderName::from_str(&entry.key)
            .map_err(|e| format!("Invalid header name '{}': {}", entry.key, e))?;
        let value = HeaderValue::from_str(&entry.value)
            .map_err(|e| format!("Invalid header value for '{}': {}", entry.key, e))?;
        header_map.insert(name, value);
    }

    let mut req_builder = client.request(method, &request.url).headers(header_map);

    if let Some(body) = &request.body {
        req_builder = req_builder.body(body.clone());
    }

    let start = Instant::now();

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let elapsed = start.elapsed();
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_string();
    let status_code = status.as_u16();

    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            headers.insert(key.to_string(), v.to_string());
        }
    }

    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let size_bytes = body_bytes.len() as u64;
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponse {
        status: status_code,
        status_text,
        headers,
        body,
        time_ms: elapsed.as_millis() as u64,
        size_bytes,
    })
}

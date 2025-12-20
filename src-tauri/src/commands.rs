use crate::http::client::{self, HttpRequest};

#[tauri::command]
pub async fn send_request(
    request: HttpRequest,
) -> Result<client::HttpResponse, String> {
    client::execute_request(request).await
}

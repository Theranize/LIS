import db from "../config/db.js";

export async function createRequestLog(data) {

  const sql = `
    INSERT INTO analyzer_requests
    (request_ulid, analyzer_code, analyzer_ip, request_data)
    VALUES (?, ?, ?, ?)
  `;

  await db.execute(sql, [
    data.request_ulid,
    data.analyzer_code,
    data.analyzer_ip,
    data.request_data
  ]);
}

export async function updateRequestLog(data) {

  const sql = `
    UPDATE analyzer_requests
    SET response_data = ?, error_message = ?, updated_at = NOW()
    WHERE request_ulid = ?
  `;

  await db.execute(sql, [
    data.response_data,
    data.error_message,
    data.request_ulid
  ]);
}
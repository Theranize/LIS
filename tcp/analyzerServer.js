import net from "net";
import { astmParser } from "../parsers/astmParser.js";
import { saveResults } from "../services/resultService.js";
import { createRequestLog, updateRequestLog } from "../services/requestLogService.js";
import { ulid } from "ulid";

// ASTM control characters
const ENQ = "\x05"; // Enquiry (start communication)
const ACK = "\x06"; // Acknowledge
const NAK = "\x15"; // Negative Acknowledge
const EOT = "\x04"; // End of Transmission
const STX = "\x02"; // Start of Text (frame start)

export function startAnalyzerServer(port = 8017) {

  const server = net.createServer((socket) => {

    console.log("Analyzer connected:", socket.remoteAddress);

    // Store incoming frames for one complete message
    let frames = [];

    // Unique request ID for logging
    let requestUlid = null;

    socket.on("data", async (data) => {

      const msg = data.toString();

      try {

        // 🔹 1. Handle ENQ (start of communication)
        if (msg.includes(ENQ)) {
          console.log("ENQ received");

          // Send ACK to allow analyzer to start sending data
          socket.write(ACK);

          // Initialize new request
          frames = [];
          requestUlid = ulid();

          // Log initial request
          await createRequestLog({
            request_ulid: requestUlid,
            analyzer_code: null,
            analyzer_ip: socket.remoteAddress,
            request_data: "ENQ RECEIVED"
          });

          return;
        }

        // 🔹 2. Handle EOT (end of transmission)
        if (msg.includes(EOT)) {
          console.log("EOT received");

          // Combine all frames into a single message
          const fullMessage = frames.join("");

          console.log("Full ASTM Message:", fullMessage);

          // Parse ASTM message
          const parsed = astmParser(fullMessage);
          parsed["requestUlid"] = requestUlid;

          console.log("Parsed Data:", parsed);

          // Save parsed results into database
          await saveResults(parsed);

          // Update request log as success
          await updateRequestLog({
            request_ulid: requestUlid,
            response_data: "SUCCESS",
            error_message: null,
            analyzer_code: parsed.analyzer
          });

          // Reset state for next message
          frames = [];
          requestUlid = null;

          return;
        }

        // 🔹 3. Handle data frames (STX...ETX)
        if (msg.includes(STX)) {

          console.log("Frame received");

          // Store frame
          frames.push(msg);

          // Send ACK for each frame
          socket.write(ACK);

          return;
        }

        // 🔹 4. Unknown or unsupported data
        console.log("Unknown packet received:", msg);

      } catch (err) {

        console.error("Processing error:", err);

        // Send NAK on error
        socket.write(NAK);

        // Update log with error details
        if (requestUlid) {
          await updateRequestLog({
            request_ulid: requestUlid,
            response_data: null,
            error_message: err.message
          });
        }
      }

    });

    socket.on("close", () => {
      console.log("Analyzer disconnected");
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err.message);
    });

  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`ASTM TCP Server running on port ${port}`);
  });

}
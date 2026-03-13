import net from "net";
import { parseHL7 } from "../parsers/hl7Parser.js";
import { astmParser } from "../parsers/astmParser.js";
import { saveResults } from "../services/resultService.js";
import { buildACK } from "../utils/ackBuilder.js";
import { createRequestLog, updateRequestLog } from "../services/requestLogService.js";
import { ulid } from "ulid";

export function startAnalyzerServer(port = 5000) {

  const server = net.createServer((socket) => {

    console.log("Analyzer connected:", socket.remoteAddress);

    let buffer = "";

    socket.on("data", async (data) => {

      buffer += data.toString();

      if (buffer.includes("\x1C") || buffer.includes("\n")) {

        const message = buffer;
        buffer = "";

        const requestUlid = ulid();

        try {

          // 🔹 First store raw request
          await createRequestLog({
            request_ulid: requestUlid,
            analyzer_code: null,
            analyzer_ip: socket.remoteAddress,
            request_data: message
          });

          // const parsed = parseHL7(message);
          const parsed = astmParser(message);

          parsed["requestUlid"] = requestUlid;

          console.log("Parsed:", parsed);

          await saveResults(parsed);

          const ack = buildACK(parsed.messageId, parsed.analyzer);

          socket.write(ack);

          // 🔹 Update success response
          await updateRequestLog({
            request_ulid: requestUlid,
            response_data: ack,
            error_message: null
          });

          console.log("ACK sent");

        } catch (err) {

          console.error("Processing error:", err);

          // 🔹 Update error log
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
    console.log(`HL7 TCP Server running on port ${port}`);
  });

}
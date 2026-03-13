Below is a clean production-style Node.js HL7 Analyzer Server using Express + ES Modules (import/export).
It will:

✅ Run Express API + TCP HL7 server together
✅ Use ES Modules (import/export)
✅ Accept multiple analyzer connections on one port
✅ Handle MLLP HL7 messages
✅ Parse MSH / OBR / OBX segments
✅ Save results in MySQL
✅ Send ACK response

This structure is modern and scalable. 🚀

1️⃣ Project Structure
hl7-analyzer-server
│
├── config
│   └── db.js
│
├── parsers
│   └── hl7Parser.js
│
├── services
│   └── resultService.js
│
├── utils
│   └── ackBuilder.js
│
├── tcp
│   └── analyzerServer.js
│
├── routes
│   └── healthRoute.js
│
├── app.js
└── package.json
2️⃣ package.json

Important: "type": "module"

{
  "name": "hl7-analyzer-server",
  "version": "1.0.0",
  "type": "module",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "mysql2": "^3.10.0"
  }
}

Install:

npm install express mysql2
3️⃣ Database Table
CREATE TABLE analyzer_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analyzer VARCHAR(50),
    sample_id VARCHAR(50),
    test_code VARCHAR(50),
    value VARCHAR(50),
    unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
4️⃣ Database Config

config/db.js

import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "lis_db",
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;
5️⃣ HL7 Parser

parsers/hl7Parser.js

export function parseHL7(rawMessage) {

  const clean = rawMessage
    .replace(/\x0B/g, "")
    .replace(/\x1C/g, "")
    .replace(/\x0D/g, "\r");

  const segments = clean.split("\r");

  const result = {
    analyzer: null,
    messageId: null,
    sampleId: null,
    tests: []
  };

  for (const segment of segments) {

    const fields = segment.split("|");

    switch (fields[0]) {

      case "MSH":
        result.analyzer = fields[2];
        result.messageId = fields[9];
        break;

      case "OBR":
        result.sampleId = fields[3];
        break;

      case "OBX":
        result.tests.push({
          testCode: fields[3],
          value: fields[5],
          unit: fields[6]
        });
        break;

    }

  }

  return result;
}
6️⃣ Result Service

services/resultService.js

import db from "../config/db.js";

export async function saveResults(result) {

  const { analyzer, sampleId, tests } = result;

  for (const test of tests) {

    await db.execute(
      `INSERT INTO analyzer_results
      (analyzer, sample_id, test_code, value, unit)
      VALUES (?, ?, ?, ?, ?)`,
      [
        analyzer,
        sampleId,
        test.testCode,
        test.value,
        test.unit
      ]
    );

  }

}
7️⃣ ACK Builder

utils/ackBuilder.js

export function buildACK(messageId, analyzer) {

  const time = new Date().toISOString();

  const ack =
`MSH|^~\\&|LIS|LAB|${analyzer}|LAB|${time}||ACK|${messageId}|P|2.3\r
MSA|AA|${messageId}\r`;

  return "\x0B" + ack + "\x1C\r";
}
8️⃣ TCP Analyzer Server

tcp/analyzerServer.js

import net from "net";
import { parseHL7 } from "../parsers/hl7Parser.js";
import { saveResults } from "../services/resultService.js";
import { buildACK } from "../utils/ackBuilder.js";

export function startAnalyzerServer(port = 5000) {

  const server = net.createServer((socket) => {

    console.log("Analyzer connected:", socket.remoteAddress);

    let buffer = "";

    socket.on("data", async (data) => {

      buffer += data.toString();

      if (buffer.includes("\x1C")) {

        const message = buffer;
        buffer = "";

        console.log("\nHL7 MESSAGE RECEIVED:");
        console.log(message);

        try {

          const parsed = parseHL7(message);

          console.log("Parsed:", parsed);

          await saveResults(parsed);

          const ack = buildACK(parsed.messageId, parsed.analyzer);

          socket.write(ack);

          console.log("ACK sent");

        } catch (err) {

          console.error("Processing error:", err);

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

  server.listen(port, () => {
    console.log(`HL7 TCP Server running on port ${port}`);
  });

}
9️⃣ Express Route (Health Check)

routes/healthRoute.js

import express from "express";

const router = express.Router();

router.get("/health", (req, res) => {

  res.json({
    status: "Analyzer server running"
  });

});

export default router;
🔟 Express App

app.js

import express from "express";
import healthRoute from "./routes/healthRoute.js";
import { startAnalyzerServer } from "./tcp/analyzerServer.js";

const app = express();

app.use(express.json());

app.use("/api", healthRoute);

const HTTP_PORT = 3000;
const HL7_PORT = 5000;

app.listen(HTTP_PORT, () => {
  console.log(`Express API running on port ${HTTP_PORT}`);
});

startAnalyzerServer(HL7_PORT);
1️⃣1️⃣ Run Server
node app.js

Output:

Express API running on port 3000
HL7 TCP Server running on port 5000
1️⃣2️⃣ System Architecture
           Analyzer Machines
        (BS230 / BC5000 / Maglumi)
                   │
                   │ HL7 (MLLP)
                   ▼
            TCP HL7 Server
             (PORT 5000)
                   │
                   ▼
              HL7 Parser
                   │
                   ▼
              Result Service
                   │
                   ▼
               MySQL DB

           Express API (3000)
            └── /api/health
1️⃣3️⃣ Example Analyzer Message
MSH|^~\&|BS230|LAB|LIS|HOSP|202603111200||ORU^R01|1234|P|2.3
PID|||123456||John Doe
OBR|1||SAMPLE100||GLU
OBX|1|NM|GLU||105|mg/dL|70-110|N
OBX|2|NM|UREA||30|mg/dL|10-50|N

Saved to DB as:

SAMPLE100
GLU  = 105
UREA = 30
🚀 Next Level (Recommended for LIS)

If you want, I can also show you hospital-grade architecture with:

⭐ Analyzer auto-detection
⭐ ASTM + HL7 support
⭐ dynamic analyzer configuration from DB
⭐ real-time analyzer connection monitor
⭐ message queue system
⭐ duplicate result prevention

That system can handle 100+ analyzers simultaneously.
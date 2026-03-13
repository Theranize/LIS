import "./config/env.js";
import express from "express";
import healthRoute from "./routes/healthRoute.js";
import { startAnalyzerServer } from "./tcp/analyzerServer.js";

const app = express();

app.use(express.json());

app.use("/api", healthRoute);

const HTTP_PORT = process.env.API_PORT || 8018;
const HL7_PORT = process.env.TCP_PORT || 8017;

app.listen(HTTP_PORT, () => {
  console.log(`Express API running on port ${HTTP_PORT}`);
});

startAnalyzerServer(HL7_PORT);
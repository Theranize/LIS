import "./config/env.js";
import express from "express";
// import healthRoute from "./routes/healthRoute.js";
// import analyzerRoute from "./routes/analyzerRoute.js";
// import resultRoute from "./routes/resultRoute.js";
// import reportRoute from "./routes/reportRoute.js";
// import limsRoute from "./routes/limsRoute.js";
import { startAnalyzerServer } from "./tcp/analyzerServer.js";

const app = express();

app.use(express.json());

// API Routes
// app.use("/api", healthRoute);
// app.use("/api", analyzerRoute);
// app.use("/api", resultRoute);
// app.use("/api", reportRoute);
// app.use("/api", limsRoute);

const HTTP_PORT = process.env.API_PORT || 8018;
const SOCKET_PORT = process.env.TCP_PORT || 8017;

app.listen(HTTP_PORT, () => {
  console.log(`Express API running on port ${HTTP_PORT}`);
});

startAnalyzerServer(SOCKET_PORT);
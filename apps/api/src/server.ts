import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "./db.js";
import { freightsRouter } from "./routes/freights.js";
import { taggiesRouter } from "./routes/taggies.js";

dotenv.config();

type DatabaseState = "connecting" | "up" | "down";

const port = Number(process.env.PORT || 8080);
const mongoUri = process.env.MONGODB_URI;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express();

let dbReady = false;
let dbState: DatabaseState = mongoUri ? "connecting" : "down";
let dbError: string | null = mongoUri ? null : "MONGODB_URI nao configurado.";
let shuttingDown = false;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}

app.disable("x-powered-by");
app.use(
  cors({
    origin: corsOrigin.split(",").map((entry) => entry.trim()),
  }),
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "api",
    http: "up",
    db: dbState,
    dbReady,
    dbError,
    port,
    time: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "api",
    http: "up",
    db: dbState,
    dbReady,
    dbError,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

app.use("/api", (req, res, next) => {
  if (!dbReady && req.path !== "/health") {
    return res.status(503).json({
      message: dbError || "Banco de dados indisponivel no momento.",
      db: dbState,
    });
  }

  next();
});

app.use("/api/freights", freightsRouter);
app.use("/api/taggies", taggiesRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Rota nao encontrada." });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Erro interno do servidor.";
  console.error(error);
  res.status(500).json({ message });
});

console.log("[startup] Inicializando API.", {
  pid: process.pid,
  nodeEnv: process.env.NODE_ENV || "undefined",
  port,
  railwayPort: process.env.PORT || null,
  hasMongoUri: Boolean(mongoUri),
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`API pronta na porta ${port}`);
  console.log("[server] address", server.address());
});

server.on("error", (error) => {
  console.error("[server] Erro no servidor HTTP:", error);
  process.exit(1);
});

mongoose.connection.on("connected", () => {
  dbState = "up";
  dbReady = true;
  dbError = null;
  console.log("[db] MongoDB conectado com sucesso.");
});

mongoose.connection.on("disconnected", () => {
  dbState = "down";
  dbReady = false;
  console.warn("[db] Conexao com MongoDB encerrada.");
});

mongoose.connection.on("error", (error) => {
  dbState = "down";
  dbReady = false;
  dbError = getErrorMessage(error);
  console.error("[db] Erro na conexao com MongoDB:", error);
});

async function initializeDatabase(): Promise<void> {
  if (!mongoUri) {
    dbState = "down";
    dbReady = false;
    dbError = "MONGODB_URI nao configurado.";
    console.error("[db] MONGODB_URI nao configurado. API seguira viva sem banco.");
    return;
  }

  dbState = "connecting";
  dbReady = false;
  dbError = null;
  console.log("[db] Iniciando conexao com MongoDB.");

  try {
    await connectToDatabase(mongoUri);
  } catch (error) {
    dbState = "down";
    dbReady = false;
    dbError = getErrorMessage(error);
    console.error("[db] Falha ao conectar no MongoDB:", error);
  }
}

function finalizeProcessExit(exitCode: number): void {
  void mongoose.connection.close().catch((error) => {
    console.error("[db] Erro ao encerrar conexao com MongoDB:", error);
  }).finally(() => {
    process.exit(exitCode);
  });
}

function handleSignal(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    console.warn(`[process] ${signal} recebido novamente durante shutdown.`);
    return;
  }

  shuttingDown = true;
  console.warn(`[process] ${signal} recebido.`);

  const forceExitTimer = setTimeout(() => {
    console.error("[process] Shutdown excedeu 10s. Encerrando com falha.");
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref();

  server.close(() => {
    console.log("[server] Servidor HTTP encerrado.");
    clearTimeout(forceExitTimer);
    finalizeProcessExit(0);
  });
}

process.on("SIGTERM", () => {
  handleSignal("SIGTERM");
});

process.on("SIGINT", () => {
  handleSignal("SIGINT");
});

process.on("beforeExit", (code) => {
  console.log(`[process] beforeExit com code=${code}`);
});

process.on("exit", (code) => {
  console.log(`[process] exit com code=${code}`);
});

process.on("uncaughtException", (error) => {
  console.error("[process] uncaughtException:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection:", reason);
});

void initializeDatabase();

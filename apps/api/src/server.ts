import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "./db.js";
import { freightsRouter } from "./routes/freights.js";
import { taggiesRouter } from "./routes/taggies.js";

dotenv.config();

const port = Number(process.env.PORT || 3001);
const mongoUri = process.env.MONGODB_URI;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

if (!mongoUri) {
  throw new Error("MONGODB_URI não configurado.");
}

const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: corsOrigin.split(",").map((entry) => entry.trim()),
  }),
);
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Conexão com MongoDB indisponível.");
    }

    await db.admin().ping();
    return res.json({
      ok: true,
      time: new Date().toISOString(),
      db: "ok",
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      time: new Date().toISOString(),
      db: "error",
      message: error instanceof Error ? error.message : "Erro ao acessar o MongoDB.",
    });
  }
});

app.use("/api/freights", freightsRouter);
app.use("/api/taggies", taggiesRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Erro interno do servidor.";
  console.error(error);
  res.status(500).json({ message });
});

async function bootstrap() {
  await connectToDatabase(mongoUri as string);
  app.listen(port, "0.0.0.0", () => {
    console.log(`API pronta na porta ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Falha ao iniciar a API:", error);
  process.exit(1);
});

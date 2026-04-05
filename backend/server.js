const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";

app.use(cors({ origin: frontendOrigin === "*" ? true : frontendOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "technexus-api",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    project: "TechNexus",
    environment: process.env.NODE_ENV || "production"
  });
});

app.post("/api/contact", (req, res) => {
  const { nombre, email, mensaje } = req.body || {};

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      ok: false,
      error: "Faltan campos requeridos"
    });
  }

  return res.json({
    ok: true,
    message: "Solicitud recibida"
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.listen(port, () => {
  console.log(`TechNexus API listening on port ${port}`);
});

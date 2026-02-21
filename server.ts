import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("receipts.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    tax REAL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/receipts", (req, res) => {
    try {
      const receipts = db.prepare("SELECT * FROM receipts ORDER BY date DESC").all();
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.post("/api/receipts", (req, res) => {
    const { merchant, date, amount, tax, currency, category, image_url } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO receipts (merchant, date, amount, tax, currency, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(merchant, date, amount, tax, currency || 'USD', category, image_url);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save receipt" });
    }
  });

  app.delete("/api/receipts/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM receipts WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete receipt" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

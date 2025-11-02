import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  Middleware Order is Important
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(morgan("dev"));

//  Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use(limiter);

// Static folder
app.use(express.static(path.join(__dirname, "public")));

//  Routes
import authRoutes from "./src/routes/auth.js";
import medicineRoutes from "./src/routes/medicines.js";
import billingRoutes from "./src/routes/bills.js";
import reportRoutes from "./src/routes/reports.js";

app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/reports", reportRoutes);

//  Base Route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🩺 Medical Store Management API",
    version: "1.0.0",
    author: "PV Private Limited",
  });
});

//  404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

export default app;

require("dotenv").config();

const dns = require("dns");
const dnsServers = (process.env.DNS_SERVERS || (process.env.NODE_ENV === "development" ? "8.8.8.8,8.8.4.4" : ""))
    .split(",").map(value => value.trim()).filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const medicineRoutes = require("./routes/medicines");
const requestRoutes = require("./routes/requests");
const rewardRoutes = require("./routes/rewards");
const adminRewardRoutes = require("./routes/adminRewards");
const adminRoutes = require("./routes/admin");
const reportRoutes = require("./routes/reports");
const { protect, authorizeRoles } = require("./middleware/auth");

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY_HOPS !== undefined) {
    const proxyHops = Number(process.env.TRUST_PROXY_HOPS);
    if (!Number.isSafeInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) {
        throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 5.");
    }
    app.set("trust proxy", proxyHops);
}
app.use(helmet({ strictTransportSecurity: process.env.NODE_ENV === "production" ? undefined : false }));

const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(origin => {
        const parsed = new URL(origin);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin === "null") {
            throw new Error("FRONTEND_URL must contain valid http or https origins.");
        }
        return parsed.origin;
    });
const allowedOrigins = new Set(configuredOrigins);
if (process.env.NODE_ENV !== "production") {
    ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000", "null"]
        .forEach(origin => allowedOrigins.add(origin));
}
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(null, false);
    }
}));
app.use(express.json({ limit: "32kb", strict: true }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "production" ? 10 : 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Try again later." }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/admin/rewards", adminRewardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/protected", protect, (req, res) => {
    res.json({ message: "You accessed a protected route!", user: req.user });
});
app.get("/", (req, res) => res.json({ message: "MediBridge API is running" }));
app.get("/api/admin-test", protect, authorizeRoles("ADMIN"), (req, res) => {
    res.json({ message: "You are authorized as ADMIN", user: req.user });
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number.isInteger(error.status) ? error.status : Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (status >= 500) console.error("HTTP request failed:", req.method, req.path, error.name || "Error");
    if (status === 413) return res.status(413).json({ message: "Request body is too large." });
    if (status === 400) return res.status(400).json({ message: "Invalid request body." });
    return res.status(status >= 400 && status < 500 ? status : 500).json({ message: status < 500 ? "Request could not be processed." : "Server error" });
});

async function startServer() {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be configured before starting the API.");
    if (process.env.NODE_ENV === "production") {
        if (Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) throw new Error("Production JWT_SECRET must be at least 32 bytes.");
        if (!configuredOrigins.length) throw new Error("FRONTEND_URL must be configured in production.");
    }
    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");

    await connectDB();
    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`MediBridge API listening on port ${port}`);
            resolve(server);
        });
        server.once("error", reject);
    });
}

if (require.main === module) {
    startServer().catch(error => {
        console.error("MediBridge API failed to start:", error.name || "Error");
        process.exitCode = 1;
    });
}

module.exports = { app, startServer };

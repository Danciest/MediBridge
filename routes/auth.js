const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();
const publicRoles = ["DONOR", "PHARMACY", "NGO", "HOSPITAL"];
const allowedRegistrationFields = new Set(["name", "email", "password", "role", "phone", "address", "city"]);
const dummyPasswordHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function validEmail(value) { return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function sendRegistrationError(res, error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ message: "Registration details are invalid." });
    console.error("REGISTER ERROR:", error.name || "Error");
    return res.status(500).json({ message: "Server error" });
}

router.post("/register", async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ message: "A JSON object is required." });
    if (Object.keys(body).some(key => !allowedRegistrationFields.has(key))) {
        return res.status(400).json({ message: "Registration includes unsupported fields." });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    const role = typeof body.role === "string" ? body.role.trim().toUpperCase() : "";
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: "Name must be between 2 and 100 characters." });
    if (!validEmail(email)) return res.status(400).json({ message: "A valid email address is required." });
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
        return res.status(400).json({ message: "Password must be at least 12 characters and no more than 72 bytes." });
    }
    if (role === "ADMIN") return res.status(403).json({ message: "Admin accounts cannot be created through public registration." });
    if (!publicRoles.includes(role)) return res.status(400).json({ message: "Role must be DONOR, PHARMACY, NGO, or HOSPITAL." });
    for (const field of ["phone", "address", "city"]) {
        if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].trim().length > ({ phone: 40, address: 250, city: 120 }[field]))) {
            return res.status(400).json({ message: `${field} must be a string of an allowed length.` });
        }
    }

    try {
        const existingUser = await User.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, "i") }).select("_id");
        if (existingUser) return res.status(409).json({ message: "An account with this email already exists." });
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
            ...(body.address !== undefined ? { address: body.address.trim() } : {}),
            ...(body.city !== undefined ? { city: body.city.trim() } : {})
        });
        return res.status(201).json({
            message: "User registered successfully",
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) { return sendRegistrationError(res, error); }
});

router.post("/login", async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.email !== "string" || typeof body.password !== "string") {
        return res.status(400).json({ message: "Please provide email and password." });
    }
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    if (!validEmail(email) || password.length === 0 || Buffer.byteLength(password, "utf8") > 72) {
        return res.status(401).json({ message: "Invalid email or password" });
    }
    try {
        const user = await User.findOne({ email }).select("name email password role active");
        const passwordMatches = await bcrypt.compare(password, user?.password || dummyPasswordHash);
        if (!user || !passwordMatches) return res.status(401).json({ message: "Invalid email or password" });
        if (user.active === false) return res.status(403).json({ message: "This account has been suspended. Contact an administrator." });

        const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "1d" });
        return res.json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, active: true }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error.name || "Error");
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;

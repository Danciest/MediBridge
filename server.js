require("dotenv").config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS
// Or use Cloudflare: dns.setServers(['1.1.1.1', '1.0.0.1']);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/database");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "MediBridge API is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
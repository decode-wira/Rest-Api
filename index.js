const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Konfigurasi environment variables
const GITHUB_TOKEN = "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";
const REPO_OWNER = "decode-wira";
const REPO_NAME = "Rest-Api";
const FILE_PATH = "database.json";
const API_KEY = "CALLLINE";
const JWT_SECRET = "CALLLINE";

const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
const HEADERS = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
};

// Struktur database default
const DEFAULT_DB = {
    users: [],
    historyRequest: {},
    count: 0,
    visitor: 0,
    deposits: []
};

// Helper functions
async function fetchGitHubFile() {
    try {
        const response = await axios.get(GITHUB_API_URL, {
            headers: HEADERS,
            params: { timestamp: Date.now() }
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
    }
}

async function getDatabase() {
    try {
        const fileData = await fetchGitHubFile();
        if (!fileData) return DEFAULT_DB;
        
        const content = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));
        return {
            ...DEFAULT_DB,
            ...content,
            users: content.users || [],
            historyRequest: content.historyRequest || {}
        };
    } catch (error) {
        console.error("Gagal mengambil database:", error.message);
        return DEFAULT_DB;
    }
}

async function saveDatabase(database) {
    try {
        const fileData = await fetchGitHubFile();
        const payload = {
            message: "Update database.json",
            content: Buffer.from(JSON.stringify(database, null, 2)).toString("base64"),
            sha: fileData?.sha
        };

        const method = fileData ? "put" : "post";
        await axios[method](GITHUB_API_URL, payload, { headers: HEADERS });
        console.log("Database berhasil disimpan!");
        return true;
    } catch (error) {
        console.error("Gagal menyimpan database:", error.message);
        return false;
    }
}

// Middleware
async function databaseMiddleware(req, res, next) {
    req.db = await getDatabase();
    next();
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) return res.status(401).json({ message: "Token diperlukan!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token tidak valid!" });
        req.user = user;
        next();
    });
}

// Fungsi utilitas
const getTodayDate = () => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .split("T")[0];
};

async function updateUsage(apikey) {
    const db = await getDatabase();
    const user = db.users.find(u => u.apikey === apikey);
    
    if (!user) return { success: false, message: "API key tidak valid" };
    if (user.limit <= 0) return { success: false, message: "Limit harian habis" };

    const today = getTodayDate();
    
    // Reset limit harian
    if (user.lastReset !== today) {
        user.limit = user.premium ? 1500 : 100;
        user.lastReset = today;
    }

    // Kurangi limit
    user.limit -= 1;
    db.count = (db.count || 0) + 1;
    db.historyRequest[today] = (db.historyRequest[today] || 0) + 1;

    await saveDatabase(db);
    return { success: true };
}

// Fungsi tambah pengunjung baru
async function tambahPengunjung() {
    try {
        const db = await getDatabase();
        db.visitor = (db.visitor || 0) + 1;
        await saveDatabase(db);
        return true;
    } catch (error) {
        console.error("Gagal menambah pengunjung:", error);
        return false;
    }
}

// Routes
app.get("/", async (req, res) => {
    const db = await getDatabase();
    db.visitor = (db.visitor || 0) + 1;
    await saveDatabase(db);
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", async (req, res) => {
    await tambahPengunjung();
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/auth/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "daftar.html"));
});

app.get("/auth/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/user/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/user/upgrade", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "upgrade.html"));
});

app.post("/api/register", databaseMiddleware, async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: "Username dan password diperlukan" });
    }

    if (req.db.users.some(u => u.username === username)) {
        return res.status(409).json({ message: "Username sudah terdaftar" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            username,
            password: hashedPassword,
            apikey: require("crypto").randomBytes(16).toString("hex"),
            limit: 100,
            premium: false,
            lastReset: getTodayDate(),
            createdAt: new Date().toISOString()
        };

        req.db.users.push(newUser);
        await saveDatabase(req.db);

        res.status(201).json({
            message: "Registrasi berhasil",
            apikey: newUser.apikey
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal melakukan registrasi" });
    }
});

app.post("/api/login", databaseMiddleware, async (req, res) => {
    const { username, password } = req.body;
    const user = req.db.users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Kredensial tidak valid" });
    }

    const token = jwt.sign(
        { userId: user.apikey, username: user.username },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ 
        message: "Login berhasil",
        token,
        user: {
            username: user.username,
            apikey: user.apikey,
            limit: user.limit,
            premium: user.premium
        }
    });
});

app.get("/api/profile", authenticateToken, databaseMiddleware, async (req, res) => {
    const user = req.db.users.find(u => u.apikey === req.user.userId);
    
    if (!user) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    res.json({
        username: user.username,
        apikey: user.apikey,
        limit: user.limit,
        premium: user.premium,
        registeredAt: user.createdAt
    });
});

app.post("/api/upgrade-premium", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Token tidak ditemukan!" });
    }

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET); // Diperbaiki menggunakan JWT_SECRET
        const database = await getDatabase();
        const user = database.users.find((u) => u.username === decoded.username);

        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan!" });
        }

        if (user.premium) {
            return res.status(400).json({ message: "Akun sudah premium!" });
        }

        user.premium = true;
        user.limit = 1500;
        await saveDatabase(database);

        res.json({ 
            message: "Akun berhasil di-upgrade ke premium!", 
            premium: true, 
            limit: user.limit,
            newApiKey: user.apikey // Tambahan informasi API key
        });
    } catch (error) {
        return res.status(403).json({ message: "Token tidak valid!" });
    }
});

app.get("/api/history-request", async (req, res) => {
    try {
        const database = await getDatabase();
        res.json({ historyRequest: database.historyRequest });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data history request!", error: error.message });
    }
});

app.get("/api/total-request", async (req, res) => {
    try {
        const database = await getDatabase();
        res.json({ totalRequest: database.count });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data total request!", error: error.message });
    }
});

app.get("/api/request-today", async (req, res) => {
    try {
        const database = await getDatabase();
        const today = getTodayDate();
        const requestToday = database.historyRequest[today] || 0;
        res.json({ requestToday });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data request hari ini!", error: error.message });
    }
});

app.get("/api/total-visitor", async (req, res) => {
    try {
        const database = await getDatabase();
        res.json({ totalVisitor: database.visitor });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data jumlah pengunjung!", error: error.message });
    }
});

app.get("/api/total-users", async (req, res) => {
    try {
        const database = await getDatabase();
        const totalUsers = database.users.length;
        res.json({ totalUsers });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data jumlah pengguna!", error: error.message });
    }
});


let depositDataStore = [];
app.post("/api/deposit", async (req, res) => {
    const { nominal, method, reff_id } = req.body;
    if (!nominal || !method || !reff_id) return res.status(400).json({ error: "Semua data harus diisi" });
    try {
        const response = await axios.post("https://forestapi.web.id/api/h2h/deposit/create", {
            nominal,
            method,
            reff_id,
            api_key: API_KEY
        });
        if (response.data.status === "success") {
            let depositData = {
                id: response.data.data.id,
                reff_id,
                nominal,
                method,
                status: "pending",
                qr_url: response.data.data.qr_image_url,
                expired_at: response.data.data.expired_at
            };
            depositDataStore.push(depositData);
            res.json({ success: true, data: depositData });
        } else {
            res.status(400).json({ error: response.data.message || "Gagal membuat deposit" });
        }
    } catch (error) {
        console.error("❌ Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Server error", detail: error.response ? error.response.data : error.message });
    }
});

app.get("/api/deposit/status/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`https://forestapi.web.id/api/h2h/deposit/status?id=${id}&api_key=${API_KEY}`);
        if (response.data.status === "success") {
            let depositIndex = depositDataStore.findIndex(d => d.id === id);
            if (depositIndex !== -1) {
                depositDataStore[depositIndex].status = response.data.data.status;
            }
            res.json({ success: true, data: response.data.data });
        } else {
            res.status(400).json({ error: response.data.message || "Gagal cek status deposit" });
        }
    } catch (error) {
        console.error("❌ Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Server error", detail: error.response ? error.response.data : error.message });
    }
});

app.get("/api/glowtext", async (req, res) => {
    const { text, apikey } = req.query;
    if (!text) return res.status(400).json({ message: "Parameter 'text' diperlukan!" });
    if (!apikey) return res.status(400).json({ message: "Parameter 'apikey' diperlukan!" });
    try {
        const result = await UpdateDb(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });
        const imageUrl = `https://dummyimage.com/500x500/ffffff/000000&text=${encodeURIComponent(text)}`;
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const database = await getDatabase();
        res.setHeader("Content-Type", "image/png");
        res.setHeader("X-Total-Request", database.count || 0);
        res.setHeader("X-Request-Today", database.historyRequest[getTodayDate()] || 0);
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil gambar!", error: error.message });
    }
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    // Jadwal reset limit harian
    setInterval(async () => {
        const db = await getDatabase();
        const today = getTodayDate();
        let needsUpdate = false;
        
        db.users = db.users.map(user => {
            if (user.lastReset !== today) {
                user.limit = user.premium ? 1500 : 100;
                user.lastReset = today;
                needsUpdate = true;
            }
            return user;
        });

        if (needsUpdate) {
            await saveDatabase(db);
            console.log("Limit pengguna telah di-reset");
        }
    }, 3600000); // Setiap 1 jam
});

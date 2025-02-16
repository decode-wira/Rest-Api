const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const GITHUB_TOKEN = "#";
const REPO_OWNER = "decode-wira";
const REPO_NAME = "Rest-Api";
const FILE_PATH = "database.json";
const API_KEY = "CALLLINE";

const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
const HEADERS = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
};

async function getDatabase() {
    try {
        const { data } = await axios.get(GITHUB_API_URL, { headers: HEADERS, params: { timestamp: Date.now() } });
        if (!data.content) throw new Error("Data tidak ditemukan");
        const content = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
        return content || { users: [], historyRequest: {}, count: 0, visitor: 0 };
    } catch (error) {
        console.error("Gagal mengambil database:", error.response?.data || error.message);
        return { users: [], historyRequest: {}, count: 0, visitor: 0 };
    }
}

async function saveDatabase(database) {
    try {
        const { data } = await axios.get(GITHUB_API_URL, { headers: HEADERS });
        if (!data.sha) throw new Error("SHA tidak ditemukan, gagal update");
        await axios.put(
            GITHUB_API_URL,
            {
                message: "Update database.json",
                content: Buffer.from(JSON.stringify(database, null, 2)).toString("base64"),
                sha: data.sha,
            },
            { headers: HEADERS }
        );
        console.log("Database berhasil diperbarui!");
    } catch (error) {
        console.error("Gagal menyimpan database:", error.response?.data || error.message);
    }
}

async function tambahPengunjung() {
    const database = await getDatabase();
    database.visitor = (database.visitor || 0) + 1;
    await saveDatabase(database);
}

const getTodayDate = () => new Date().toISOString().split("T")[0];

async function resetLimitHarian() {
    const database = await getDatabase();
    const today = new Date().toISOString();
    database.users = database.users.map(user => {
        if (!user.last_reset || new Date(user.last_reset).toISOString().split("T")[0] !== getTodayDate()) {
            user.limit = user.premium ? 1500 : 100;
            user.last_reset = today;
        }
        return user;
    });    
    await saveDatabase(database);
}


function authenticateToken(req, res, next) {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "Token diperlukan!" });

    jwt.verify(token.split(" ")[1], "secret_key", (err, user) => {
        if (err) return res.status(403).json({ message: "Token tidak valid!" });
        req.user = user;
        next();
    });
}

async function UpdateDb(apikey) {
    const database = await getDatabase();
    const today = getTodayDate();
    const user = database.users.find((u) => u.apikey === apikey);
    if (!user) return { success: false, message: "Apikey tidak valid!" };
    if (user.limit <= 0) return { success: false, message: "Limit penggunaan habis!" };

    user.limit -= 1;
    database.count = (database.count || 0) + 1;

    if (!database.historyRequest) database.historyRequest = {};
    if (!database.historyRequest[today]) database.historyRequest[today] = 0;
    database.historyRequest[today] += 1;

    await saveDatabase(database);
    return { success: true };
}

app.get("/", async (req, res) => {
    await tambahPengunjung();
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/auth/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "daftar.html"));
});
app.get("/auth/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/dashboard", async (req, res) => {
    await tambahPengunjung();
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});
app.get("/user/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});
app.get("/user/upgrade", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "upgrade.html"));
});




app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username dan password harus diisi!" });
    }
    const database = await getDatabase();
    if (!database.users) {
        database.users = [];
    }
    if (database.users.some((user) => user.username === username)) {
        return res.status(400).json({ message: "Username sudah digunakan!" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const apikey = Math.random().toString(36).substring(2, 15);
    const user = {
        username,
        password: hashedPassword,
        apikey,
        limit: 100,
        premium: false,
        last_reset: new Date().toISOString(),
    };
    database.users.push(user);
    await saveDatabase(database);
    res.json({ message: "User berhasil terdaftar!", apikey });
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const database = await getDatabase();
    const user = database.users.find((u) => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Username atau password salah!" });
    }
    const token = jwt.sign({ username, apikey: user.apikey }, "secret_key", { expiresIn: "1h" });
    res.json({ message: "Login berhasil!", token });
});

app.get("/api/profile", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Token tidak ditemukan!" });
    }
    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), "secret_key");
        const database = await getDatabase();
        const user = database.users.find((u) => u.username === decoded.username);
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan!" });
        }
        res.json({
            username: user.username,
            apikey: user.apikey,
            limit: user.limit,
        });
    } catch (error) {
        return res.status(403).json({ message: "Token tidak valid!" });
    }
});

app.post("/api/upgrade-premium", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: "Token tidak ditemukan!" });
    }

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), "secret_key");
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

        res.json({ message: "Akun berhasil di-upgrade ke premium!", premium: true, limit: user.limit });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    await resetLimitHarian();
});

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { canvas, registerFont, createCanvas } = require('canvas');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

// =====

const { BingImageSearch, searchWikipedia,
bingSearch, bingVideoSearch, pinterest, Cerpen, processImage, downloadInstagram, terabox, generateImageWithText, spotifySearch, profileImg, Search1, capcudl, douyindl, spotifydl, pindl, mediafiredl, GDrive, CatBox, takeScreenshot, wikiImage, sfilesrc, srcLyrics, videydl, igstalk, npmStalk, komiktapsrc, komiktapsrcq, SimSimi } = require('./lib/function')

// =====

// Konfigurasi environment variables
const GITHUB_TOKEN = "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";
const REPO_OWNER = "decode-wira";
const REPO_NAME = "Rest-Api";
const FILE_PATH = "database.json";
const API_KEY = "sk-9xykbw8sdn2xrm";
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

app.get('/user/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/user/credit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/credit.html'));
});

app.get("/user/upgrade", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "upgrade.html"));
});

// Api Utama ( Jangan Otak Atik )

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
        user.limit = 10.000;
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

// Nah Ini Bagian End Point

// == Search

const apiKey = 'AIzaSyAajE2Y-Kgl8bjPyFvHQ-PgRUSMWgBEsSk';
const cx = 'e5c2be9c3f94c4bbb';

app.get('/api/search/google', async (req, res) => {
    const { text, apikey } = req.query;
    
    if (!text) return res.status(400).json({ status: false, data: 'Contoh penggunaan: ?text=halo' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const query = encodeURIComponent(text);
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&key=${apiKey}&cx=${cx}`;

    try {
        const response = await axios.get(url);
        const items = response.data.items || [];

        res.json({
            status: true,
            creator: "Hello Line",
            data: items.map(item => ({
                title: item.title,
                description: item.snippet,
                link: item.link,
            })),
        });
    } catch (err) {
        return res.status(500).json({ status: false, creator: "Hello Line", error: err.message });
    }
});

app.get('/api/search/images', async (req, res) => {
    const { text, apikey } = req.query;
    
    if (!text) return res.status(400).json({ status: false, data: 'Isi parameter text' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const query = encodeURIComponent(text);
    const randomStartIndex = Math.floor(Math.random() * 90) + 1;
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&key=${apiKey}&cx=${cx}&searchType=image&num=10&start=${randomStartIndex}`;

    try {
        const response = await axios.get(url);
        const items = response.data.items || [];

        res.json({
            status: true,
            creator: "Hello Line",
            data: items.map(item => ({
                title: item.title,
                image: item.link,
                contextLink: item.image.contextLink,
                thumbnail: item.image.thumbnailLink,
            })),
        });
    } catch (err) {
        return res.status(500).json({ status: false, creator: "Hello Line", error: err.message });
    }
});

app.get('/api/search/pinterest', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ error: 'Isi Parameter Query' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const images = await pinterest(query);
        if (images.length > 0) {
            return res.json({ status: true, creator: "Hello Line", data: images });
        } else {
            return res.status(404).json({ status: false, creator: "Hello Line", message: 'No images found' });
        }
    } catch (error) {
        return res.status(500).json({ status: false, creator: "Hello Line", error: error.message });
    }
});

app.get('/api/search/bingimg', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ status: false, creator: "Hello Line", error: "Isi parameter Query." });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const images = await BingImageSearch(query);
        return res.json({ status: true, creator: "Hello Line", data: images });
    } catch (error) {
        return res.status(500).json({ status: false, creator: "Hello Line", error: error.message });
    }
});

app.get('/api/search/bingsearch', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ status: false, creator: "Hello Line", error: "Isi parameter query" });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const results = await bingSearch(query);
        res.status(200).json({ status: true, creator: "Hello Line", data: results });
    } catch (error) {
        res.status(500).json({ status: false, creator: "Hello Line", error: error.message || 'Error performing Bing search' });
    }
});

app.get('/api/search/bingvid', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ status: false, creator: "Hello Line", error: "Query is required" });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const results = await bingVideoSearch(query);
        res.status(200).json({ status: true, creator: "Hello Line", data: results });
    } catch (error) {
        res.status(500).json({ status: false, creator: "Hello Line", error: error.message || 'Error performing Bing video search' });
    }
});

app.get('/api/search/wiki', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ status: false, error: "Isi parameter Query." });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const searchResults = await searchWikipedia(query);
        return res.json({ status: true, creator: "Hello Line", data: searchResults });
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
});

app.get('/api/search/wikiimage', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ error: 'Parameter "query" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const result = await wikiImage(query);
        res.json({ status: true, creator: "Hello Line", data: result });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

app.get('/api/search/lyrics', async (req, res) => {
    const { song, apikey } = req.query;

    if (!song) return res.status(400).json({ error: 'Parameter "song" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const result = await srcLyrics(song);
        res.json({ status: true, creator: "Hello Line", data: result });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

app.get('/api/search/sfile', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ error: 'Parameter "query" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const result = await sfilesrc(query);
        res.json({ status: true, creator: "Hello Line", data: result });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

app.get('/api/search/pixabay', async (req, res) => {
    const { query, apikey } = req.query;

    if (!query) return res.status(400).json({ status: false, error: "Isi parameter Query." });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const response = await axios.get('https://pixabay.com/api/', {
            params: {
                key: '47718946-26aab78979a05a0ee8db4190d', // Ganti dengan API Key Anda
                q: query,
                image_type: 'photo',
            }
        });

        if (response.data.hits.length === 0) {
            return res.status(404).json({ status: false, error: "Tidak ditemukan gambar." });
        }

        const randomIndex = Math.floor(Math.random() * response.data.hits.length);
        const imageUrl = response.data.hits[randomIndex].webformatURL;

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const contentType = imageResponse.headers['content-type']; 
        res.set('Content-Type', contentType); 
        return res.send(imageResponse.data);
    } catch (error) {
        return res.status(500).json({ status: false, error: "Terjadi kesalahan saat memproses permintaan." });
    }
});

app.get('/api/search/cerpen', async (req, res) => {
    const { category, apikey } = req.query;

    if (!category) {
        return res.status(400).json({ status: false, creator: "Hello Line", error: "Isi parameter Category." });
    }
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const cerpen = await Cerpen(category);
        return res.json({ status: true, creator: "Hello Line", data: cerpen });
    } catch (error) {
        return res.status(500).json({ status: false, creator: "Hello Line", error: error.message });
    }
});

app.get('/api/search/spotify', async (req, res) => {
    const { q, apikey } = req.query;

    if (!q) return res.status(400).json({ error: 'Parameter "q" dibutuhkan' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const results = await spotifySearch(q);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/search/komiktap', async (req, res) => {
    const { apikey } = req.query;

    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await komiktapsrc();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/search/komiktaps', async (req, res) => {
    const { q, apikey } = req.query;

    if (!q) return res.status(400).json({ error: 'Parameter "q" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await komiktapsrcq(q);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === Download

app.get("/api/download/tiktok", async (req, res) => {
  const { url, apikey } = req.query;
  if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
  if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const { tiktokdl } = require("tiktokdl");
    const data = await tiktokdl(url);
    if (!data) return res.status(404).json({ error: "Data tidak ditemukan." });

    res.json({ status: true, creator: "Hello Line", result: data });
  } catch (e) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

app.get('/api/download/douyin', async (req, res) => {
  const { url, apikey } = req.query;
  if (!url) return res.status(400).json({ error: "Parameter 'url' diperlukan." });
  if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const data = await douyindl(url);
    if (data.error) return res.status(400).json(data);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

app.get('/api/download/spotify', async (req, res) => {
  const { url, apikey } = req.query;
  if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
  if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const data = await spotifydl(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

app.get('/api/download/pinterest', async (req, res) => {
  const { url, apikey } = req.query;
  if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
  if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const data = await pindl(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

app.get('/api/download/videydl', async (req, res) => {
  const { url, apikey } = req.query;
  if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
  if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const videoUrl = await videydl(url);
    res.json({ videoUrl });
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

app.get('/api/download/mediafire', async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await mediafiredl(url);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download/gdrive', async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await GDrive(url);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download/capcut', async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ error: 'Parameter "url" diperlukan.' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await capcutdl(url);
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ error: 'Data tidak ditemukan atau gagal mengambil data.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

app.get('/api/download/instagram', async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) {
        return res.status(400).json({
            status: false,
            creator: "Hello Line",
            error: "Parameter 'url' diperlukan.",
        });
    }
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await downloadInstagram(url);
        if (data.status) {
            res.status(200).json(data);
        } else {
            res.status(500).json(data);
        }
    } catch (error) {
        res.status(500).json({
            status: false,
            creator: "Hello Line",
            error: error.message || 'Terjadi kesalahan saat memproses permintaan.',
        });
    }
});

app.get("/api/download/facebook", async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ status: false, creator: "Hello Line", error: "URL is required" });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const response = await axios.get(`https://api.vreden.web.id/api/fbdl?url=${url}`);
        res.status(200).json({
            status: true,
            creator: "Hello Line",
            data: response.data.data,
        });
    } catch (error) {
        res.status(500).json({ status: false, creator: "Hello Line", error: error.message });
    }
});

app.get("/api/download/terabox", async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ status: false, creator: "Hello Line", error: "URL is required" });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const data = await terabox(url);
        res.status(200).json({
            status: true,
            creator: "Hello Line",
            data: data,
        });
    } catch (error) {
        res.status(500).json({ status: false, creator: "Hello Line", error: error.message });
    }
});

// === Maker 

app.get("/api/maker/glowtext", async (req, res) => {
    const { text, apikey } = req.query;
    if (!text) return res.status(400).json({ message: "Parameter 'text' diperlukan!" });
    if (!apikey) return res.status(400).json({ message: "Parameter 'apikey' diperlukan!" });
    try {
        const result = await updateUsage(apikey);
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

app.get('/api/maker/brat', async (req, res) => {
  const { text, apikey } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Parameter "text" wajib disertakan.' });
  }

  if (!apikey) {
    return res.status(401).json({ error: 'API key diperlukan.' });
  }

  try {
    const result = await updateUsage(apikey);
    if (!result.success) {
      return res.status(403).json({ message: result.message });
    }

    const imageBuffer = await generateImageWithText(text);
    res.setHeader('Content-Type', 'image/png');
    res.end(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan saat membuat gambar.' });
  }
});

// == Ai 

app.get('/api/ai/simsimi', async (req, res) => {
    const { text, lang, apikey } = req.query;
    if (!text || !apikey) {
        return res.status(400).json({ success: false, message: 'Masukkan text dan apikey!' });
    }
    const checkKey = await updateUsage(apikey);
    if (!checkKey.success) {
        return res.status(403).json(checkKey);
    }
    try {
        const response = await SimSimi(text, lang || 'id');
        res.json({
            success: true,
            message: response
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mendapatkan respons dari SimSimi!' });
    }
});

// == Tools

app.get('/api/tools/ssweb', async (req, res) => {
    const { url, apikey } = req.query;
    
    if (!url) return res.status(400).json({ error: 'Masukkan parameter url' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 480, height: 800, isMobile: true });
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });

        const screenshotBuffer = await page.screenshot({ type: 'png' });
        await browser.close();

        const filename = `screenshot-${Date.now()}.png`;
        const imageUrl = await CatBox(screenshotBuffer, filename);
        res.redirect(imageUrl);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil screenshot', detail: error.message });
    }
});

app.get('/api/tools/sswebv2', async (req, res) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ error: 'Masukkan parameter url' });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const [urlHP, urlTab, urlDesk] = await Promise.all([
            takeScreenshot(url, 480, 800, 'mobile'),
            takeScreenshot(url, 800, 1280, 'tablet'),
            takeScreenshot(url, 1024, 768, 'desktop')
        ]);

        res.json({ success: true, creator: "Hello Line", urlHP, urlTab, urlDesk });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Gagal mengambil screenshot', detail: error.message });
    }
});

const processImageHandler = async (req, res, type) => {
    const { url, apikey } = req.query;

    if (!url) return res.status(400).json({ error: `Parameter 'url' diperlukan.` });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);
        const processedImage = await processImage(imageBuffer, type);

        res.setHeader('Content-Type', 'image/png');
        res.send(processedImage);
    } catch (error) {
        res.status(500).json({ error: `Gagal memproses gambar (${type}).`, detail: error.message });
    }
};

app.get('/api/tools/enhance', async (req, res) => processImageHandler(req, res, 'enhance'));
app.get('/api/tools/dehaze', async (req, res) => processImageHandler(req, res, 'dehaze'));
app.get('/api/tools/recolor', async (req, res) => processImageHandler(req, res, 'recolor'));

app.get('/api/tools/cekip', async (req, res) => {
    const { ip, apikey } = req.query;

    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const url = ip ? `http://ip-api.com/json/${encodeURIComponent(ip)}` : `http://ip-api.com/json/`;
        const response = await axios.get(url);

        if (response.data.status === "fail") {
            return res.status(400).json({ status: false, error: response.data.message || "Invalid IP address." });
        }

        res.json({ status: true, creator: "Hello Line", data: response.data });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.', detail: error.message });
    }
});

// == End Wak

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
    }, 86400000); // Setiap 1 jam
});
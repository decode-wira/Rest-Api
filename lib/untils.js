const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

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
    users: [{
    isAdmin: false,
    isBanned: false,
    banExpiresAt: null
  }],
    historyRequest: {},
    count: 0,
    visitor: 0,
    deposits: [],
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
        if (user.isOwner) {
      user.isAdmin = true; // Owner selalu admin
    }
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
    user.limit -= 1; // Bebas Kurangin Limit Ketika Respon Succes
    db.count = (db.count || 0) + 1;
    db.historyRequest[today] = (db.historyRequest[today] || 0) + 1;

    await saveDatabase(db);
    return { success: true };
}

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

module.exports = { updateUsage, tambahPengunjung, databaseMiddleware, fetchGitHubFile, getDatabase, saveDatabase, authenticateToken, getTodayDate } ;

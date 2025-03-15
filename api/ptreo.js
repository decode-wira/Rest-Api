const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const router = express.Router();
const { updateUsage } = require('../lib/untils')

function kapital(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const egg = 15; 
const location = 1;

app.get("/ptero", async (req, res) => {
    const { domain, apikey, username, password, ram, disk, cpu } = req.query;

    if (!domain || !apikey || !username || !password || !ram || !disk || !cpu) {
        return res.status(400).json({ error: "Semua parameter wajib diisi!" });
    }

    try {
        const email = `${username}@gmail.com`;
        const name = kapital(username) + "123";

        let userResponse = await fetch(`${domain}/api/application/users`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
            body: JSON.stringify({
                email,
                username,
                first_name: name,
                last_name: "LinexCloud",
                language: "en",
                password,
            }),
        });

        let userData = await userResponse.json();
        if (userData.errors) {
            return res.status(500).json({ error: userData.errors[0] });
        }

        let user = userData.attributes;
        let usr_id = user.id;

        // Mendapatkan startup command dari egg
        // Mendapatkan startup command dari egg
       let eggResponse = await fetch(`${domain}/api/application/nests/5/eggs/${egg}`, {
        method: "GET",
        headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`,
    },
});

        let eggData = await eggResponse.json();

        console.log("Egg Response:", JSON.stringify(eggData, null, 2));

        if (!eggData || !eggData.attributes || !eggData.attributes.startup) {
    return res.status(500).json({ error: "Gagal mendapatkan startup command dari egg!" });
}

       let startup_cmd = eggData.attributes.startup;
        
        let serverResponse = await fetch(`${domain}/api/application/servers`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
            body: JSON.stringify({
                name: name,
                description: "Server Berhasil Dibuat Oleh Wira",
                user: usr_id,
                egg: egg,
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
                startup: startup_cmd,
                environment: {
                    INST: "npm",
                    USER_UPLOAD: "0",
                    AUTO_UPDATE: "0",
                    CMD_RUN: "npm start",
                },
                limits: {
                    memory: parseInt(ram),
                    swap: 0,
                    disk: parseInt(disk),
                    io: 500,
                    cpu: parseInt(cpu),
                },
                feature_limits: {
                    databases: 5,
                    backups: 5,
                    allocations: 5,
                },
                deploy: {
                    locations: [location],
                    dedicated_ip: false,
                    port_range: [],
                },
            }),
        });

        let serverData = await serverResponse.json();
        if (serverData.errors) {
            return res.status(500).json({ error: serverData.errors[0] });
        }

        let server = serverData.attributes;

        return res.json({
            message: "Panel account dan server berhasil dibuat!",
            server_id: server.id,
            username,
            password,
            login_url: domain,
            ram: ram === "0" ? "Unlimited" : `${ram}MB`,
            cpu: cpu === "0" ? "Unlimited" : `${cpu}%`,
            disk: disk === "0" ? "Unlimited" : `${disk}MB`,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan." });
    }
});

module.exports = router;
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const { updateUsage } = require('../lib/untils')
const { downloadInstagram, terabox, capcutdl, douyindl, spotifydl, pindl, mediafiredl, GDrive, videydl } = require('../lib/function.js')

router.get("/tiktok", async (req, res) => {
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

router.get('/douyin', async (req, res) => {
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

router.get('/spotify', async (req, res) => {
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

router.get('/pinterest', async (req, res) => {
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

router.get('/videydl', async (req, res) => {
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

router.get('/mediafire', async (req, res) => {
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

router.get('/gdrive', async (req, res) => {
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

router.get('/capcut', async (req, res) => {
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

router.get('/instagram', async (req, res) => {
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

router.get("/facebook", async (req, res) => {
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

router.get("/terabox", async (req, res) => {
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

module.exports = router;
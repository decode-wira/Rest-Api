const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const { updateUsage } = require('../lib/untils')
app.set("json spaces", 2);
const { downloadInstagram, terabox, capcutdl, douyindl, spotifydl, pindl, mediafiredl, GDrive, videydl } = require('../lib/function.js')

router.get("/tiktok", async (req, res) => {
    const { url, apikey } = req.query;    
    if (!url) return res.status(400).json({ message: "URL TikTok diperlukan" });
    if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const params = new URLSearchParams();
        params.append("url", url);
        params.append("hd", "1");

        const response = await axios.post("https://tikwm.com/api/", params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const data = response.data.data;
        if (!data) return res.status(404).json({ message: "Video tidak ditemukan" });

        res.json({
            source: "TikTok Downloader",
            source: "Wira",
            title: data.title,
            videoUrl: data.play,
            audioUrl: data.music,
            author: data.author.nickname,
            username: data.author.unique_id,
            likes: data.digg_count,
            views: data.play_count
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal memproses tautan", error: error.message });
    }
});

router.get("/tiktokmp3", async (req, res) => {
    const { url, apikey } = req.query;
    if (!url) return res.status(400).json({ message: "URL TikTok diperlukan" });
    if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const params = new URLSearchParams();
        params.append("url", url);
        params.append("hd", "1");

        const response = await axios.post("https://tikwm.com/api/", params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const data = response.data.data;
        if (!data) return res.status(404).json({ message: "Audio tidak ditemukan" });

        res.json({
            source: "TikTok MP3 Downloader",
            source: "Wira",
            title: data.title,
            audioUrl: data.music,
            author: data.author.nickname,
            username: data.author.unique_id,
            likes: data.digg_count,
            views: data.play_count
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal memproses tautan", error: error.message });
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

router.get('/soundcloud', async (req, res) => {
  const { url, apikey } = req.query;

  if (!url) return res.status(400).json({ message: "URL diperlukan" });
  
  if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    let response = await axios.get("https://soundcloudmp3.org/id");
    let $ = cheerio.load(response.data);
    let _token = $("form#conversionForm > input[type=hidden]").attr("value");

    let conversion = await axios("https://soundcloudmp3.org/converter", {
      data: new URLSearchParams(Object.entries({ _token, url })),
      headers: { cookie: response.headers["set-cookie"], accept: "UTF-8" },
      method: "post",
    });

    let $$ = cheerio.load(conversion.data);
    let resultData = {
      thumb: $$("div.info.clearfix > img").attr("src"),
      title: $$("div.info.clearfix > p:nth-child(2)").text().replace("Title:", "").trim(),
      duration: $$("div.info.clearfix > p:nth-child(3)").text().replace(/Length\:|Minutes/gi, "").trim(),
      quality: $$("div.info.clearfix > p:nth-child(4)").text().replace("Quality:", "").trim(),
      url: $$("a#download-btn").attr("href"),
    };

    if (!resultData.url || !resultData.quality || !resultData.duration || !resultData.title || !resultData.thumb) {
      return res.status(400).json({ status: 400, creator: "Evolve", message: "Link Invalid" });
    }

    res.json({ status: conversion.status, creator: "Evolve", result: resultData });
  } catch (error) {
    res.status(500).json({ status: 500, creator: "Evolve", message: "Terjadi kesalahan server", error: error.message });
  }
});

module.exports = router;
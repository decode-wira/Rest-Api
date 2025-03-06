const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const { updateUsage } = require('../lib/untils')
const { processImage, CatBox, cekPesanMail, createAccountMail, getTokenMail } = require('../lib/function.js')

router.get('/ssweb', async (req, res) => {
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

router.get('/enhance', async (req, res) => processImageHandler(req, res, 'enhance'));
router.get('/dehaze', async (req, res) => processImageHandler(req, res, 'dehaze'));
router.get('/recolor', async (req, res) => processImageHandler(req, res, 'recolor'));

router.get('/cekip', async (req, res) => {
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

router.get('/createmail', async (req, res) => {
    const { namePrefix, apikey } = req.query;

    if (!namePrefix) return res.status(400).json({ error: "Parameter 'namePrefix' diperlukan." });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const account = await createAccountMail(namePrefix);
        res.json({ status: true, creator: "Hello Line", data: account });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

router.get('/gettokenmail', async (req, res) => {
    const { email, password, apikey } = req.query;

    if (!email || !password) return res.status(400).json({ error: "Parameter 'email' dan 'password' diperlukan." });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const token = await getTokenMail(email, password);
        res.json({ status: true, creator: "Hello Line", data: { token } });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

router.get('/cekpesanmail', async (req, res) => {
    const { token, apikey } = req.query;

    if (!token) return res.status(400).json({ error: "Parameter 'token' diperlukan." });
    if (!apikey) return res.status(401).json({ error: 'API key diperlukan.' });

    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    try {
        const messages = await cekPesanMail(token);
        res.json({ status: true, creator: "Hello Line", data: messages });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

module.exports = router;

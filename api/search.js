const express = require('express');
const axios = require('axios');
const router = express.Router();
const { updateUsage } = require('../index')

const { BingImageSearch, searchWikipedia,
bingSearch, bingVideoSearch, pinterest, Cerpen, spotifySearch, wikiImage, sfilesrc, srcLyrics, komiktapsrc, komiktapsrcq } = require('../lib/function')

const apiKey = 'AIzaSyAajE2Y-Kgl8bjPyFvHQ-PgRUSMWgBEsSk';
const cx = 'e5c2be9c3f94c4bbb';

router.get('/google', async (req, res) => {
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

router.get('/images', async (req, res) => {
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

router.get('/pinterest', async (req, res) => {
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

router.get('/bingimg', async (req, res) => {
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

router.get('/bingsearch', async (req, res) => {
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

router.get('/bingvid', async (req, res) => {
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

router.get('/wiki', async (req, res) => {
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

router.get('/wikiimage', async (req, res) => {
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

router.get('/lyrics', async (req, res) => {
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

router.get('/sfile', async (req, res) => {
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

router.get('/pixabay', async (req, res) => {
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

router.get('/cerpen', async (req, res) => {
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

router.get('/spotify', async (req, res) => {
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

router.get('/komiktap', async (req, res) => {
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

router.get('/komiktaps', async (req, res) => {
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

module.exports = router;
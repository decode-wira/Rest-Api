const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
app.set("json spaces", 2);
const { updateUsage } = require('../lib/untils')

const { BingImageSearch, searchWikipedia,
bingSearch, bingVideoSearch, pinterest, Cerpen, spotifySearch, wikiImage, sfilesrc, srcLyrics, komiktapsrc, komiktapsrcq, gempa, islamicnews, islamicsearch, islamicdetail, RumahMisteri, DetailRumahMisteri, cariGC, playstore, happymod, soundCloudSearch, stickerSearch } = require('../lib/function.js')

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
  const { query, limit, apikey } = req.query;
  if (!apikey) {
    return res.status(403).json({
      status: false,
      code: 403,
      creator: "Hello Line",
      result: { message: "API key diperlukan" },
    });
  }
  
  const result = await updateUsage(apikey);
  if (!result.success) {
    return res.status(403).json({ 
      status: false,
      code: 403,
      creator: "Hello Line",
      result: { message: result.message }
    });
  }

  if (!query) {
    return res.status(400).json({
      status: false,
      code: 400,
      creator: "Hello Line",
      result: { message: "Query parameter 'query' diperlukan" },
    });
  }
  
  try {
    const result = await pinterest.search(query, limit || 30);
    return res.json({ status: true, creator: "Hello Line", ...result });
  } catch (error) {
    return res.status(500).json({
      status: false,
      code: 500,
      creator: "Hello Line",
      result: { message: "Internal server error" },
    });
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

router.get('/gempa', async (req, res) => {
    const apikey = req.query.apikey;
    if (!apikey) return res.status(400).json({ message: 'API key diperlukan' });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const { data } = await axios.get('https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg');
        const $ = cheerio.load(data);

        const drasa = [];
        $('table > tbody > tr:nth-child(1) > td:nth-child(6) > span').each((_, el) => {
            drasa.push($(el).text().trim());
        });

        const format = {
            imagemap: $('div.modal-body > div > div:nth-child(1) > img').attr('src'),
            magnitude: $('table > tbody > tr:nth-child(1) > td:nth-child(4)').text().trim(),
            kedalaman: $('table > tbody > tr:nth-child(1) > td:nth-child(5)').text().trim(),
            wilayah: $('table > tbody > tr:nth-child(1) > td:nth-child(6) > a').text().trim(),
            waktu: $('table > tbody > tr:nth-child(1) > td:nth-child(2)').text().trim(),
            lintang_bujur: $('table > tbody > tr:nth-child(1) > td:nth-child(3)').text().trim(),
            dirasakan: drasa.join('\n')
        };

        res.json({
            source: 'www.bmkg.go.id',
            data: format
        });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data', error: error.message });
    }
});

router.get("/islamicnews", async (req, res) => {
  const apikey = req.query.apikey;
  if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const { data } = await axios.get("https://islami.co/artikel-terkini/");
    const $ = cheerio.load(data);
    const articles = [];

    $("article").each((_, el) => {
      articles.push({
        summary: $(el).find(".meta-top").text().trim(),
        title: $(el).find(".entry-title a").text().trim(),
        link: $(el).find(".entry-title a").attr("href"),
      });
    });

    res.json({ source: "islami.co", articles });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil berita terbaru", error: error.message });
  }
});

router.get("/islamicsearch", async (req, res) => {
  const { query, apikey } = req.query;
  if (!query) return res.status(400).json({ message: "Query pencarian diperlukan" });
if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const url = `https://islami.co/?s=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const results = [];

    const count = $(".counter strong").text().trim();
    const summary = `Hasil ditemukan: ${count} artikel`;

    $(".content-excerpt").each((_, el) => {
      results.push({
        title: $(el).find(".entry-title a").text().trim(),
        link: $(el).find(".entry-title a").attr("href"),
        category: $(el).find(".meta-top .post-term a").text().trim(),
        author: $(el).find(".meta-bottom .post-author a").text().trim(),
        date: $(el).find(".meta-bottom .post-date").text().trim(),
        image: $(el).find("picture img").attr("src") || $(el).find("picture img").attr("data-src"),
      });
    });

    res.json({ source: "islami.co", summary, results });
  } catch (error) {
    res.status(500).json({ message: "Gagal mencari berita", error: error.message });
  }
});

router.get("/islamicdetail", async (req, res) => {
  const { url, apikey } = req.query;  
  if (!url) return res.status(400).json({ message: "URL berita diperlukan" });
  if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const detail = {
      title: $("h1.entry-title").text().trim(),
      author: $(".post-author a").text().trim(),
      date: $(".post-date").text().trim(),
      content: $(".entry-content p").map((_, el) => $(el).text().trim()).get().join("\n\n"),
      image: $(".entry-media img").attr("src"),
      link: url,
    };

    res.json({ source: "islami.co", detail });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil detail berita", error: error.message });
  }
});

router.get("/rumahmisteri", async (req, res) => {
  const apikey = req.query.apikey;
  if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const url = "https://rumahmisteri.com/";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const articles = [];

    $(".archive-grid-post-wrapper article").each((_, el) => {
      const title = $(el).find("h2.entry-title a").text().trim();
      const link = $(el).find("h2.entry-title a").attr("href");
      const image = $(el).find(".post-thumbnail img").attr("src");
      const category = $(el).find(".post-cats-list a").text().trim();
      const date = $(el).find(".posted-on time").attr("datetime");

      if (title && link) {
        articles.push({ title, link, image, category, date });
      }
    });

    if (articles.length === 0) return res.status(404).json({ message: "Tidak ada artikel yang ditemukan" });

    const randomArticle = articles[Math.floor(Math.random() * articles.length)];
    res.json({ source: "rumahmisteri.com", article: randomArticle });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
  }
});

router.get("/rumahmisteri-detail", async (req, res) => {
  const { url, apikey } = req.query;
  if (!url) return res.status(400).json({ message: "URL artikel diperlukan" });
if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const detail = {
      title: $("h1.entry-title").text().trim(),
      description: $('meta[name="description"]').attr("content"),
      image: $('meta[property="og:image"]').attr("content"),
      category: $('meta[property="article:section"]').attr("content"),
      date: $("time.entry-date").attr("datetime"),
      author: $("span.author.vcard a").text().trim(),
      content: $(".entry-content p")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n"),
      link: url,
    };

    res.json({ source: "rumahmisteri.com", detail });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail artikel", error: error.message });
  }
});

router.get("/carigc", async (req, res) => {
    const { query, apikey } = req.query;
    if (!query) return res.status(400).json({ message: "Query pencarian diperlukan" });
if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const url = `https://groupsor.link/group/searchmore/${encodeURIComponent(query.replace(" ", "-"))}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const resultArray = [];

        $(".maindiv").each((i, el) => {
            const title = $(el).find("img").attr("alt")?.trim();
            const thumb = $(el).find("img").attr("src")?.trim();
            if (title && thumb) {
                resultArray.push({ title, thumb });
            }
        });

        $("div.post-info-rate-share > .joinbtn").each((i, el) => {
            const link = $(el).find("a").attr("href")?.trim();
            if (link) {
                resultArray[i].link = link.replace("https://groupsor.link/group/join/", "https://chat.whatsapp.com/");
            }
        });

        $(".post-info").each((i, el) => {
            const desc = $(el).find(".descri").text().replace("... continue reading", ".....").trim();
            if (desc) {
                resultArray[i].desc = desc;
            }
        });

        if (resultArray.length === 0) {
            return res.status(404).json({ message: "Tidak ada grup ditemukan" });
        }

        res.json({ source: "groupsor.link", results: resultArray });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});

router.get("/soundcloud", async (req, res) => {
    const { query, apikey } = req.query;
    if (!query) return res.status(400).json({ message: "Query pencarian diperlukan" });
if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const url = `https://m.soundcloud.com/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let results = [];

        $(".List_VerticalList__2uQYU li").each((index, element) => {
            const title = $(element).find(".Cell_CellLink__3yLVS").attr("aria-label");
            const musicUrl = "https://m.soundcloud.com" + $(element).find(".Cell_CellLink__3yLVS").attr("href");

            if (title && musicUrl) {
                results.push({ title, url: musicUrl });
            }
        });

        if (results.length === 0) {
            return res.status(404).json({ message: "Tidak ada hasil ditemukan" });
        }

        res.json({ source: "SoundCloud", results: results.slice(0, 5) });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});

router.get("/playstore", async (req, res) => {
    const { query, apikey } = req.query;
    if (!query) return res.status(400).json({ message: "Query pencarian diperlukan" });
if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const { data } = await axios.get(`https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`);
        const $ = cheerio.load(data);
        const hasil = [];

        $('.ULeU3b > .VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.Y8RQXd > .VfPpkd-aGsRMb > .VfPpkd-EScbFb-JIbuQc.TAQqTe > a').each((i, u) => {
            const linkk = $(u).attr('href');
            const nama = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > .DdYX5').text();
            const developer = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > .wMUdtb').text();
            const img = $(u).find('.j2FCNc > img').attr('src');
            const rate = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > div').attr('aria-label');
            const rate2 = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > div > span.w2kbF').text();
            const link = `https://play.google.com${linkk}`;

            hasil.push({
                link: link,
                nama: nama || 'No name',
                developer: developer || 'No Developer',
                img: img || 'https://i.ibb.co/G7CrCwN/404.png',
                rate: rate || 'No Rate',
                rate2: rate2 || 'No Rate',
                link_dev: `https://play.google.com/store/apps/developer?id=${developer ? developer.split(" ").join('+') : ''}`
            });
        });

        if (hasil.length === 0) {
            return res.status(404).json({ message: "Tidak ada hasil ditemukan" });
        }

        res.json({ source: "Google Play Store", results: hasil.slice(0, 5) });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});

router.get("/happymod", async (req, res) => {
    const { query, apikey } = req.query;
    if (!query) return res.status(400).json({ message: "Query pencarian diperlukan" });
if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const baseUrl = "https://www.happymod.com/";
        const { data } = await axios.get(`${baseUrl}search.html?q=${encodeURIComponent(query)}`);
        const $ = cheerio.load(data);
        const hasil = [];

        $("div.pdt-app-box").each((i, elem) => {
            hasil.push({
                title: $(elem).find("a").text().trim(),
                icon: $(elem).find("img.lazy").attr("data-original") || "https://i.ibb.co/G7CrCwN/404.png",
                rating: $(elem).find("span").text().trim() || "No rating",
                link: baseUrl + $(elem).find("a").attr("href"),
            });
        });

        if (hasil.length === 0) {
            return res.status(404).json({ message: "Tidak ada hasil ditemukan" });
        }

        res.json({ source: "HappyMod", results: hasil.slice(0, 5) });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});

router.get('/sticker', async (req, res) => {
  const { query, apikey } = req.query;

  if (!query) return res.status(400).json({ message: "Query pencarian diperlukan" });
 if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

  try {
    const result = await updateUsage(apikey);
    if (!result.success) return res.status(403).json({ message: result.message });

    const data = await stickerSearch(query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server", error: error.message });
  }
});

module.exports = router;
const axios = require('axios');
const cheerio = require('cheerio');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const router = express.Router();
const { updateUsage } = require('../lib/untils')

// Otakudesu
router.get("/otakudesu/ongoing", async (req, res) => {
    try {
        const url = "https://otakudesu.cloud/ongoing-anime";
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Referer": "https://otakudesu.cloud/",
            },
        });

        if (!response.ok) throw new Error("Gagal mengambil data dari Otakudesu");

        const html = await response.text();
        const $ = cheerio.load(html);
        let results = [];

        $("div.venz ul li").each((i, el) => {
            let title = $(el).find(".thumbz img").attr("alt") || "Unknown Title";
            let image = $(el).find(".thumbz img").attr("src") || "";
            let link = $(el).find("a").attr("href") || "";
            let episode = $(el).find(".epz").text().trim() || "Unknown Episode";
            let type = $(el).find(".eptztipe").text().trim() || "Unknown Type";
            let date = $(el).find(".newnime").text().trim() || "Unknown Date";

            if (title !== "Unknown Title" && link) {
                results.push({ title, episode, type, date, link, image });
            }
        });

        if (results.length === 0) {
            return res.status(404).json({ status: false, message: "Data tidak ditemukan atau struktur berubah." });
        }

        res.json({ status: true, data: results });

    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal mengambil data", error: error.message });
    }
});

router.get("/otakudesu/complete", async (req, res) => {
    try {
        const url = "https://otakudesu.cloud/complete-anime";
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Connection": "keep-alive",
                "Referer": "https://otakudesu.cloud/",
            },
        });
        const body = await response.text();
        const $ = cheerio.load(body);
        let results = [];

        $("div.venz ul li").each((i, el) => {
            let title = $(el).find("div.thumb h2").text().trim();
            let episode = $(el).find("div.detpost div.epz").text().trim();
            let rating = $(el).find("i.fa-star").parent().text().trim();
            let date = $(el).find("div.newnime").text().trim();
            let link = $(el).find("a").attr("href");
            let image = $(el).find("img").attr("src");

            if (title && link) {
                results.push({
                    title,
                    episode,
                    rating,
                    date,
                    link,
                    image,
                });
            }
        });

        res.json({
            status: true,
            data: results,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Gagal mengambil data",
            error: error.message,
        });
    }
});

router.get("/otakudesu", async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }

    const url = `https://otakudesu.cloud/?s=${query}&post_type=anime`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.text();
        const $ = cheerio.load(data);
        const animeList = [];

        $(".chivsrc li").each((index, element) => {
            const title = $(element).find("h2 a").text().trim();
            const link = $(element).find("h2 a").attr("href");
            const imageUrl = $(element).find("img").attr("src");
            const genres = $(element).find(".set").first().text().replace("Genres : ", "").trim();
            const status = $(element).find(".set").eq(1).text().replace("Status : ", "").trim();
            const rating = $(element).find(".set").eq(2).text().replace("Rating : ", "").trim() || "N/A";

            animeList.push({ title, link, imageUrl, genres, status, rating });
        });

        res.json({ results: animeList });
    } catch (error) {
        console.error("Error fetching search results:", error);
        res.status(500).json({ error: "Error fetching data" });
    }
});

router.get("/otakudesu/detail", async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.text();
        const $ = cheerio.load(data);

        const animeInfo = {
            title: $(".fotoanime .infozingle p span b:contains('Judul')").parent().text().replace("Judul: ", "").trim(),
            japaneseTitle: $(".fotoanime .infozingle p span b:contains('Japanese')").parent().text().replace("Japanese: ", "").trim(),
            score: $(".fotoanime .infozingle p span b:contains('Skor')").parent().text().replace("Skor: ", "").trim(),
            producer: $(".fotoanime .infozingle p span b:contains('Produser')").parent().text().replace("Produser: ", "").trim(),
            type: $(".fotoanime .infozingle p span b:contains('Tipe')").parent().text().replace("Tipe: ", "").trim(),
            status: $(".fotoanime .infozingle p span b:contains('Status')").parent().text().replace("Status: ", "").trim(),
            totalEpisodes: $(".fotoanime .infozingle p span b:contains('Total Episode')").parent().text().replace("Total Episode: ", "").trim(),
            duration: $(".fotoanime .infozingle p span b:contains('Durasi')").parent().text().replace("Durasi: ", "").trim(),
            releaseDate: $(".fotoanime .infozingle p span b:contains('Tanggal Rilis')").parent().text().replace("Tanggal Rilis: ", "").trim(),
            studio: $(".fotoanime .infozingle p span b:contains('Studio')").parent().text().replace("Studio: ", "").trim(),
            genres: $(".fotoanime .infozingle p span b:contains('Genre')").parent().text().replace("Genre: ", "").trim(),
            imageUrl: $(".fotoanime img").attr("src"),
        };

        const episodes = [];
        $(".episodelist ul li").each((index, element) => {
            const episodeTitle = $(element).find("span a").text();
            const episodeLink = $(element).find("span a").attr("href");
            const episodeDate = $(element).find(".zeebr").text();
            episodes.push({ title: episodeTitle, link: episodeLink, date: episodeDate });
        });

        res.json({ animeInfo, episodes });
    } catch (error) {
        console.error("Error fetching anime details:", error);
        res.status(500).json({ error: "Error fetching data" });
    }
});

router.get("/otakudesu/download", async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.text();
        const $ = cheerio.load(data);

        const episodeInfo = {
            title: $(".download h4").text().trim(),
            downloads: [],
        };

        $(".download ul li").each((index, element) => {
            const quality = $(element).find("strong").text().trim();
            const links = $(element)
                .find("a")
                .map((i, el) => ({
                    quality,
                    link: $(el).attr("href"),
                    host: $(el).text().trim(),
                }))
                .get();
            episodeInfo.downloads.push(...links);
        });

        res.json(episodeInfo);
    } catch (error) {
        console.error("Error fetching download links:", error.message);
        res.status(500).json({ error: "Error fetching data" });
    }
});

module.exports = router;
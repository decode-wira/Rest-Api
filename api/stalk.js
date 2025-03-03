const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const { updateUsage } = require('../lib/untils')

router.get("/igstalk", async (req, res) => {
    const { user, apikey } = req.query;
    if (!apikey) return res.status(400).json({ message: "API key diperlukan" });
    if (!user) return res.status(400).json({ message: "Username Instagram diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const response = await axios.post(
            "https://privatephotoviewer.com/wp-json/instagram-viewer/v1/fetch-profile",
            { find: user },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "*/*",
                    "X-Requested-With": "XMLHttpRequest"
                }
            }
        );

        const $ = cheerio.load(response.data.html);
        let profilePicture = $("#profile-insta img").attr("src");
        const nickname = $(".col-md-8 h4").text().trim();
        const username = $(".col-md-8 h5").text().trim();
        const posts = $(".col-md-8 .text-center").eq(0).find("strong").text().trim();
        const followers = $(".col-md-8 .text-center").eq(1).find("strong").text().trim();
        const following = $(".col-md-8 .text-center").eq(2).find("strong").text().trim();
        const bio = $(".col-md-8 p").html()?.replace(/<br\s*\/?>/g, "\n").trim() || "No bio available";

        res.json({
            source: "Instagram Stalker",
            nickname,
            username,
            bio,
            posts,
            followers,
            following,
            profile: "https://www.instagram.com/" + username.replace("@", ""),
            profileUrl: profilePicture || "https://i.ibb.co/G7CrCwN/404.png"
        });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});

router.get("/npmstalk", async (req, res) => {
    const { pname, apikey } = req.query;
    if (!apikey) return res.status(400).json({ message: "API key diperlukan" });
    if (!pname) return res.status(400).json({ message: "Nama package NPM diperlukan" });

    try {
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        const stalk = await axios.get("https://registry.npmjs.org/" + pname);
        const versions = stalk.data.versions;
        const allver = Object.keys(versions);
        const verLatest = allver[allver.length - 1];
        const verPublish = allver[0];
        const packageLatest = versions[verLatest];

        res.json({
            source: "NPM Stalker",
            name: pname,
            versionLatest: verLatest,
            versionPublish: verPublish,
            versionUpdate: allver.length,
            latestDependencies: Object.keys(packageLatest.dependencies || {}).length,
            publishDependencies: Object.keys(versions[verPublish].dependencies || {}).length,
            publishTime: stalk.data.time.created,
            latestPublishTime: stalk.data.time[verLatest]
        });
    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data", error: error.message });
    }
});

router.get("/github", async (req, res) => {

    const { user, apikey } = req.query;

    if (!apikey) {
        return res.status(400).json({ 
            success: false,
            message: "API key diperlukan. Sertakan parameter 'apikey'." 
        });
    }
    if (!user) {
        return res.status(400).json({ 
            success: false,
            message: "Username GitHub diperlukan. Sertakan parameter 'user'." 
        });
    }

    try {
        const usageResult = await updateUsage(apikey);
        if (!usageResult.success) {
            return res.status(403).json({ 
                success: false,
                message: usageResult.message 
            });
        }

        const githubResponse = await axios.get(`https://api.github.com/users/${user}`);
        const data = githubResponse.data;

        return res.json({
            success: true,
            source: "GitHub Stalker",
            username: data.login,
            name: data.name || "No name available",
            bio: data.bio || "No bio available",
            avatar: data.avatar_url,
            followers: data.followers,
            following: data.following,
            repos: data.public_repos,
            profile: data.html_url,
            company: data.company || "No company information",
            location: data.location || "No location available",
            blog: data.blog || "No blog available",
            twitter: data.twitter_username || "No Twitter available",
            created_at: data.created_at,
            updated_at: data.updated_at
        });
    } catch (error) {
        
        if (error.response && error.response.status === 404) {
            return res.status(404).json({
                success: false,
                message: "User GitHub tidak ditemukan"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil data",
            error: error.message
        });
    }
});

module.exports = router;
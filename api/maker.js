const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const { updateUsage } = require('../lib/untils')
const { createCanvas, loadImage, registerFont } = require('canvas');
const { generateImageWithText } = require('../lib/function.js')

router.get('/brat', async (req, res) => {
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

router.get('/brats', async (req, res) => {
    const { teks, apikey } = req.query;
    
    if (!teks) return res.status(400).json({ message: "Parameter teks diperlukan" });
    
    if (!apikey) return res.status(400).json({ message: "API key diperlukan" });

    try {
        // Cek penggunaan API key
        const result = await updateUsage(apikey);
        if (!result.success) return res.status(403).json({ message: result.message });

        // Ambil gambar dari catbox
        const response = await axios.get('https://files.catbox.moe/vkoaby.jpg', { responseType: 'arraybuffer' });
        const img = await loadImage(Buffer.from(response.data));

        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, img.width, img.height);

        const paper_x = img.width * 0.285;
        const paper_y = img.height * 0.42;
        const paper_width = img.width * 0.42;
        const paper_height = img.height * 0.32;

        let font_size = Math.min(paper_width / 7.5, paper_height / 3.5);
        ctx.font = `${font_size}px Agus`;
        ctx.fillStyle = 'black';

        const max_width = paper_width * 0.88;
        let words = teks.split(' ');
        let lines = [];
        let line = '';

        for (let word of words) {
            let test_line = line + (line ? ' ' : '') + word;
            let test_width = ctx.measureText(test_line).width;

            if (test_width > max_width && line) {
                lines.push(line);
                line = word;
            } else {
                line = test_line;
            }
        }
        if (line) lines.push(line);

        while (lines.length * font_size > paper_height * 0.85) {
            font_size -= 2;
            ctx.font = `${font_size}px Agus`;

            let tmp_lines = [];
            let tmp_line = '';
            for (let word of words) {
                let test_line = tmp_line + (tmp_line ? ' ' : '') + word;
                let test_width = ctx.measureText(test_line).width;

                if (test_width > max_width && tmp_line) {
                    tmp_lines.push(tmp_line);
                    tmp_line = word;
                } else {
                    tmp_line = test_line;
                }
            }
            if (tmp_line) tmp_lines.push(tmp_line);
            lines = tmp_lines;
        }

        let line_height = font_size * 1.15;
        let text_height = lines.length * line_height;
        let textStartY = paper_y + (paper_height - text_height) / 2 + (lines.length > 2 ? 270 : 275);

        ctx.save();
        ctx.translate(paper_x + paper_width / 2 + 24, textStartY);
        ctx.rotate(0.12);
        ctx.textAlign = 'center';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], 0, i * line_height);
        }
        ctx.restore();

        res.setHeader('Content-Type', 'image/png');
        canvas.createPNGStream().pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan dalam proses gambar' });
    }
});

module.exports = router;

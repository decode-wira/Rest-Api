const axios = require('axios')
const cheerio = require('cheerio')
const FormData = require('form-data')
const path = require('path');
const { sizeFormatter } = require('human-readable');
const { canvas, registerFont, createCanvas } = require('canvas');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const stream = require('stream');

async function BingImageSearch(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const images = [];

    $('a.iusc').each((index, element) => {
      const metadata = $(element).attr('m');
      const imageUrlMatch = /"murl":"(.*?)"/.exec(metadata);
      if (imageUrlMatch) {
        images.push(imageUrlMatch[1]);
      }
    });

    if (images.length === 0) {
      throw new Error('Tidak ditemukan gambar untuk pencarian tersebut.');
    }

    return images;
  } catch (error) {
    throw new Error('Gagal mendapatkan gambar. Periksa koneksi atau struktur situs.');
  }
}

async function bingSearch(query) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const results = [];

        // Looping setiap hasil pencarian
        $('.b_algo').each((index, element) => {
            const title = $(element).find('h2').text();
            const link = $(element).find('a').attr('href');
            const snippet = $(element).find('.b_caption p').text();
            const image = $(element).find('.cico .rms_iac').attr('data-src');

            results.push({
                title,
                link,
                snippet,
                image: image ? `https:${image}` : null
            });
        });

        return results;
    } catch (error) {
        console.error('Error fetching Bing results:', error.message);
        throw new Error('Failed to fetch Bing search results');
    }
}

async function bingVideoSearch(query) {
    const url = `https://www.bing.com/videos/search?q=${encodeURIComponent(query)}`;

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const videoDetails = [];

        // Scraping setiap video
        $('.mc_vtvc').each((index, element) => {
            const title = $(element).find('.mc_vtvc_title strong').text();
            const duration = $(element).find('.mc_bc_rc.items').first().text();
            const views = $(element).find('.meta_vc_content').first().text();
            const uploadDate = $(element).find('.meta_pd_content').first().text();
            const channel = $(element).find('.mc_vtvc_meta_row_channel').text();
            const link = $(element).find('a').attr('href');

            videoDetails.push({
                title,
                duration,
                views,
                uploadDate,
                channel,
                link: `https://www.bing.com${link}`
            });
        });

        return videoDetails;
    } catch (error) {
        console.error('Error fetching Bing video results:', error.message);
        throw new Error('Failed to fetch Bing video search results');
    }
}

async function searchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/api.php`;
  const params = {
    action: 'query',
    list: 'search',
    srsearch: query,
    format: 'json',
    srlimit: 5, 
  };

  try {
    const { data } = await axios.get(url, { params });
    const results = data.query.search.map((item) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ''), 
      pageUrl: `https://en.wikipedia.org/?curid=${item.pageid}`,
    }));
    return results;
  } catch (error) {
    console.error(error);
    throw new Error('Gagal mencari artikel di Wikipedia.');
  }
}

async function pinterest(query) {
  try {
    const response = await axios.get(`https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${query}&data={"options":{"query":"${query}","scope":"pins","page_size":25}}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    let images = [];
    const data = response.data;

    data.resource_response.data.results.forEach(item => {
      if (item.images.orig.url) {
        images.push(item.images.orig.url);  
      }
    });

    return images;
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    return [];
  }
}


async function Cerpen(category) {
  return new Promise(async (resolve, reject) => {
    try {
      let title = category.toLowerCase().replace(/[()*]/g, "");
      let judul = title.replace(/\s/g, "-");
      let page = Math.floor(Math.random() * 5) + 1; // Halaman acak
      let get = await axios.get('http://cerpenmu.com/category/cerpen-' + judul + '/page/' + page);
      let $ = cheerio.load(get.data);
      let link = [];
      $('article.post').each(function (a, b) {
        link.push($(b).find('a').attr('href'));
      });

      // Pilih tautan secara acak
      let random = link[Math.floor(Math.random() * link.length)];
      let res = await axios.get(random);
      let $$ = cheerio.load(res.data);

      // Ekstrak data cerpen
      let hasil = {
        title: $$('#content > article > h1').text(),
        author: $$('#content > article').text().split('Cerpen: ')[1]?.split('Kategori: ')[0]?.trim(),
        kategori: $$('#content > article').text().split('Kategori: ')[1]?.split('\n')[0]?.trim(),
        lolos: $$('#content > article').text().split('Lolos moderasi pada: ')[1]?.split('\n')[0]?.trim(),
        cerita: $$('#content > article > p').text(),
      };

      resolve(hasil);
    } catch (error) {
      reject("Gagal mendapatkan cerpen. Pastikan kategori valid.");
    }
  });
}

async function processImage(imageData, action) {
  const url = `https://inferenceengine.vyro.ai/${action}`;
  const formData = new FormData();
  formData.append('model_version', '1');
  formData.append('image', imageData, `${action}_image_body.jpg`);

  try {
    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'okhttp/4.9.3',
      },
      responseType: 'arraybuffer',
    });
    return response.data; // Gambar hasil proses
  } catch (error) {
    console.error(`Error processing image (${action}):`, error.message);
    throw new Error(`Failed to process the image (${action}).`);
  }
}

async function downloadInstagram(url) {
  try {
    const { data } = await axios.post(
      'https://yt1s.io/api/ajaxSearch',
      new URLSearchParams({ p: 'home', q: url, w: '', lang: 'en' }),
      {
        headers: {
          'User-Agent': 'Postify/1.0.0',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      }
    );

    if (data.status !== 'ok') {
      throw new Error('Gagal mengambil data dari API.');
    }

    const $ = cheerio.load(data.data);
    const downloads = $('a.abutton.is-success.is-fullwidth.btn-premium')
      .map((_, el) => ({
        title: $(el).attr('title'),
        url: $(el).attr('href'),
      }))
      .get();

    if (downloads.length === 0) {
      throw new Error('Tidak ada tautan unduhan yang tersedia.');
    }

    return { success: true, downloads };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message || 'Terjadi kesalahan.' };
  }
}

async function terabox(url) {
const getdm = await axios.get(`https://ins.neastooid.xyz/api/Tools/getins?url=https://www.terabox.app/wap/share/filelist?surl=${encodeURIComponent(url)}`)
const { jsToken, bdstoken } = getdm.data
const getrsd = await axios.get(`https://ins.neastooid.xyz/api/downloader/Metaterdltes?url=${encodeURIComponent(url)}`)
const { shareId, userKey, sign, timestamp, files } = getrsd.data.metadata
const traboxdlxins = await axios.post('https://ins.neastooid.xyz/api/downloader/terade', {
shareId,
userKey,
sign,
timestamp,
jsToken,
bdstoken,
files
})
return traboxdlxins.data
}

async function generateImageWithText(text) {
  return new Promise((resolve, reject) => {
    try {
      const fontPath = path.join(__dirname, '../fonts/fonts.ttf');   
      registerFont(fontPath, { family: 'MyFont' });

      const canvasWidth = 800;
      const canvasHeight = 800;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let fontSize = 130; 
      ctx.font = `${fontSize}px "MyFont"`;
      ctx.fillStyle = 'black';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const maxWidth = canvas.width - 20; 
      let lines = [];
      let line = '';

      text.split(' ').forEach(word => {
        const testLine = line + word + ' ';
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth) {
          lines.push(line); 
          line = word + ' '; 
        } else {
          line = testLine;
        }
      });

      lines.push(line);

      let totalHeight = lines.length * fontSize;
      while (totalHeight > canvasHeight - 30 && fontSize > 10) {
        fontSize--; 
        ctx.font = `${fontSize}px "MyFont"`;
        lines = [];
        line = '';

        text.split(' ').forEach(word => {
          const testLine = line + word + ' ';
          const testWidth = ctx.measureText(testLine).width;

          if (testWidth > maxWidth) {
            lines.push(line);
            line = word + ' ';
          } else {
            line = testLine;
          }
        });

        lines.push(line);
        totalHeight = lines.length * fontSize;
      }

      let yPosition = 20; 
      const lineHeight = fontSize * 1.2; 
      lines.forEach(line => {
        ctx.fillText(line, 20, yPosition);
        yPosition += lineHeight;
      });

      const buffer = canvas.toBuffer('image/png');
      resolve(buffer);
    } catch (error) {
      reject(error);
    }
  });
}

async function getAccessToken() {
    try {
        const client_id = 'acc6302297e040aeb6e4ac1fbdfd62c3'
        const client_secret = '0e8439a1280a43aba9a5bc0a16f3f009'
        const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64')
        const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        return response.data.access_token
    } catch (err) {
        console.error(err)
    }
}

async function spotifySearch(query) {
    try {
        const access_token = await getAccessToken()
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
            headers: { Authorization: `Bearer ${access_token}` }
        })
        return response.data.tracks.items.map(track => ({
            name: track.name,
            artists: track.artists.map(artist => artist.name).join(', '),
            link: track.external_urls.spotify,
            image: track.album.images[0].url,
            duration_ms: track.duration_ms
        }));
    } catch (err) {
        console.error(err)
    }
}

async function capcutdl(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const videoElement = $('video.player-o3g3Ag');
        const videoSrc = videoElement.attr('src');
        const posterSrc = videoElement.attr('poster');
        const title = $('h1.template-title').text().trim();
        const actionsDetail = $('p.actions-detail').text().trim();
        const [date, uses, likes] = actionsDetail.split(',').map(item => item.trim());
        const authorAvatar = $('span.lv-avatar-image img').attr('src');
        const authorName = $('span.lv-avatar-image img').attr('alt');
 
        if (!videoSrc || !posterSrc || !title || !date || !uses || !likes || !authorAvatar || !authorName) {
            throw new Error('Beberapa elemen penting tidak ditemukan di halaman.');
        }
 
        return {            
            title: title,
            date: date,
            pengguna: uses,
            likes: likes,
            author: {
                name: authorName,
                avatarUrl: authorAvatar
            },
            videoUrl: videoSrc,
            posterUrl: posterSrc
        };
    } catch (error) {
        console.error('Error fetching video details:', error.message);
        return null;
    }
}

async function douyindl(url) {
  const api = "https://lovetik.app/api/ajaxSearch";
  const payload = { q: url, lang: "en" };

  const instance = axios.create({
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "origin": "https://lovetik.app",
      "referer": "https://lovetik.app/en",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    },
    withCredentials: true,
    transformRequest: [data => new URLSearchParams(data).toString()]
  });

  try {
    await instance.get("https://lovetik.app/en");
    const { data } = await instance.post(api, payload);

    if (!data.success && data.msg) {
      return { error: data.msg };
    }

    const htmlContent = data.data || data.html || '';
    const downloadUrls = htmlContent.match(/https:\/\/[^"']*\/get\?token=[^"']+/gi) || [];
    const cleanedUrls = downloadUrls.map(url => url.replace(/\\\//g, '/').replace(/&amp;/g, '&'));

    const thumbnailMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/i);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

    const titleMatch = htmlContent.match(/<h3[^>]*>(.*?)<\/h3>/is);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : 'No Title';

    if (cleanedUrls.length === 0) {
      return { error: "Link Download Tidak Ditemukan." };
    }

    return {
      title: title.trim(),
      thumbnail,
      downloadUrls: cleanedUrls,
      warning: "Link cepat expired, segera download."
    };

  } catch (error) {
    console.error("Error:", error.message);
    return {
      error: error.response?.data?.msg ||
             "Tidak dapat memproses permintaan, cek URL dengan benar."
    };
  }
}

async function capcutdl(url) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const videoElement = $('video.player-o3g3Ag');
        const videoSrc = videoElement.attr('src');
        const posterSrc = videoElement.attr('poster');
        const title = $('h1.template-title').text().trim();
        const actionsDetail = $('p.actions-detail').text().trim();
        const [date, uses, likes] = actionsDetail.split(',').map(item => item.trim());
        const authorAvatar = $('span.lv-avatar-image img').attr('src');
        const authorName = $('span.lv-avatar-image img').attr('alt');

        if (!videoSrc || !posterSrc || !title || !date || !uses || !likes || !authorAvatar || !authorName) {
            throw new Error('Beberapa elemen penting tidak ditemukan di halaman.');
        }

        return {            
            title: title,
            date: date,
            pengguna: uses,
            likes: likes,
            author: {
                name: authorName,
                avatarUrl: authorAvatar
            },
            videoUrl : videoSrc,
            posterUrl: posterSrc
        };
    } catch (error) {
        console.error('Error fetching video details:', error.message);
        return null;
    }
}

async function spotifydl(url) {
  const hai = await axios.get(`https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`)
  const hao = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${hai.data.result.gid}/${hai.data.result.id}`)
  return {
    title: hai.data.result.name,
    download: `https://api.fabdl.com${hao.data.result.download_url}`,
    image: hai.data.result.image,
    duration_ms: hai.data.result.duration_ms
  }
}

async function pindl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    })
    const $ = cheerio.load(response.data)

    const title = $('meta[property="og:title"]').attr('content') || '-'
    const description = $('meta[name="description"]').attr('content') || '-'
    const uploaded = $('meta[property="og:updated_time"]').attr('content') || '-'

    const height = $('meta[property="og:image:height"]').attr('content') || '-'
    const width = $('meta[property="og:image:width"]').attr('content') || '-'
    const fullsource = $('meta[property="pinterestapp:pinboard"]').attr('content') || '-'
    const source = fullsource ? new URL(fullsource).hostname : '-' 

    const { data } = await axios.get(url)
    const img = []
    const $$ = cheerio.load(data)
    $$('img').each((i, el) => {
      img.push($$(el).attr('src'))
    })

    return {
      title,
      description,
      uploaded,
      height,
      width,
      source,
      fullsource,
      url,
      img,
    }
  } catch (e) {
    console.error(e)
    return []
  }
}

async function mediafiredl(url) {
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
        });
        const $ = cheerio.load(res.data);
        const hasil = [];

        // Mengambil link download
        const link = $('a#downloadButton').attr('href');
        if (!link) {
            throw new Error('Link download tidak ditemukan.');
        }

        // Mengambil ukuran file
        const size = $('a#downloadButton').text()
            .replace('Download', '')
            .replace('(', '')
            .replace(')', '')
            .trim(); // Menggunakan trim untuk menghapus spasi di awal dan akhir

        // Mengambil nama file dari link
        const seplit = link.split('/');
        const nama = seplit[5]; // Pastikan indeks ini sesuai dengan struktur URL

        // Mengambil ekstensi MIME
        const mime = nama.split('.').pop(); // Mengambil ekstensi file

        // Menyimpan hasil
        hasil.push({ nama, mime, size, link });
        return hasil;
    } catch (error) {
        console.error('Error fetching MediaFire data:', error.message);
        throw new Error('Gagal mengambil data dari MediaFire.');
    }
}

const formatSize = sizeFormatter({
	std: 'JEDEC',
	decimalPlaces: 2,
	keepTrailingZeroes: false,
	render: (literal, symbol) => `${literal} ${symbol}B`
});

async function GDrive(url) {
	let id, res = {
		"error": true
	}
	if (!(url && url.match(/drive\.google/i))) return res
	try {
		id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))[1]
		if (!id) throw 'ID Not Found'
		res = await axios(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, {
			method: 'post',
			headers: {
				'accept-encoding': 'gzip, deflate, br',
				'content-length': 0,
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				'origin': 'https://drive.google.com',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
				'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
				'x-drive-first-party': 'DriveWebUi',
				'x-json-requested': 'true'
			}
		})
		let {
			fileName,
			sizeBytes,
			downloadUrl
		} = JSON.parse((await res.data).slice(4))
		if (!downloadUrl) throw 'Link Download Limit!'
		let data = await fetch(downloadUrl)
		if (data.status !== 200) return data.statusText
		return {
			downloadUrl,
			fileName,
			fileSize: formatSize(sizeBytes),
			mimetype: data.headers.get('content-type')
		}
	}
	catch (e) {
		console.log(e)
		return res
	}
};

async function CatBox(buffer, filename) {
  const data = new FormData();
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);
  data.append('reqtype', 'fileupload');
  data.append('userhash', '');
  data.append('fileToUpload', bufferStream, { filename });
  try {
      const response = await axios.post('https://catbox.moe/user/api.php', data, {
          headers: { ...data.getHeaders() }
      });
      return response.data;
  } catch (error) {
      throw new Error('Gagal upload ke Catbox');
  }
}

async function takeScreenshot(url, width, height, type) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: type === 'mobile' });
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  const screenshotBuffer = await page.screenshot({ type: 'png' });
  await browser.close();
  const filename = `screenshot-${type}-${Date.now()}.png`;
  return await CatBox(screenshotBuffer, filename);
}

async function wikiImage(teks) {
  try {
    const response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: teks,
        prop: 'pageimages',
        piprop: 'original',
        pilimit: 'max',
      },
    })

    const halaman = response.data.query.pages
    return Object.values(halaman).map((page) => ({
      title: page.title,
      image: page.original ? page.original.source : null,
    }))
  } catch (e) {
    console.error(e)
    return []
  }
}

async function srcLyrics(song) {
  const {
    data
  } = await axios.get(`https://www.lyrics.com/lyrics/${song}`);
  const $ = cheerio.load(data);
  const result = $('.best-matches .bm-case').map((i, element) => {
    const title = $(element).find('.bm-label a').first().text();
    const artist = $(element).find('.bm-label a').last().text();
    const album = $(element).find('.bm-label').eq(1).text().trim().replace(/\s+/g, ' ');
    const imageUrl = $(element).find('.album-thumb img').attr('src');
    const link = $(element).find('.bm-label a').first().attr('href');
    return {
      title,
      artist,
      album,
      imageUrl,
      link: `https://www.lyrics.com${link}`
    };
  }).get();
  return result
}

async function sfilesrc(teks) {
  try {
    const response = await axios.get(`https://sfile-api.vercel.app/search/${encodeURIComponent(teks)}`)
    if (response.data) {
      const {
        data
      } = response.data.data
      return {
        files: data.map(file => ({
          icon: file.icon,
          size: file.size,
          title: file.title,
          id: 'https://sfile.mobi/' + file.id
        }))
      }
    }
  } catch (e) {
    console.error('Error: ' + e)
    return null
  }
}

async function igstalk(user) {
	try {
		const response = await axios.post('https://privatephotoviewer.com/wp-json/instagram-viewer/v1/fetch-profile', {
			find: user,
		}, {
			headers: {
				"Content-Type": "application/json",
				Accept: "*/*",
				"X-Requested-With": "XMLHttpRequest"
			}
		});
		
		const $ = cheerio.load(response.data.html);
		
		let profilePicture = $("#profile-insta img").attr("src");
		const nickname = $(".col-md-8 h4").text().trim();
		const username = $(".col-md-8 h5").text().trim();
		const posts = $(".col-md-8 .text-center").eq(0).find("strong").text().trim();
		const followers = $(".col-md-8 .text-center").eq(1).find("strong").text().trim();
		const following = $(".col-md-8 .text-center").eq(2).find("strong").text().trim();
		const bio = $(".col-md-8 p").html().replace(/<br\s*\/?>/g, "\n").trim();
		
		return {
			data: {
				nickname,
				username,
				bio,
				posts,
				followers,
				following,
				profile: "https://www.instagram.com/" + username.replace("@", ""),
				profileUrl: profilePicture,
			},
		};
	} catch (e) {
		console.log(e);
		throw e;
	}
}

async function npmStalk(pname) {
  let stalk = await axios.get("https://registry.npmjs.org/" + pname)
  let versions = stalk.data.versions
  let allver = Object.keys(versions)
  let verLatest = allver[allver.length - 1]
  let verPublish = allver[0]
  let packageLatest = versions[verLatest]
  return {
    name: pname,
    versionLatest: verLatest,
    versionPublish: verPublish,
    versionUpdate: allver.length,
    latestDependencies: Object.keys(packageLatest.dependencies).length,
    publishDependencies: Object.keys(versions[verPublish].dependencies).length,
    publishTime: stalk.data.time.created,
    latestPublishTime: stalk.data.time[verLatest]
  }
}

async function videydl(url) {
  try {
    const objcturl = new URL(url);
    const videoId = objcturl.searchParams.get('id');

    if (!videoId) throw new Error('Invalid Videy URL');

    const ext = videoId.length === 9 && videoId[8] === '2' ? '.mov' : '.mp4';
    const urlvideo = `https://cdn.videy.co/${videoId}${ext}`;

    return urlvideo;
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

// Versi Random
const komiktapsrc = async () => {
  const kepala = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://komiktap.info/',
    'Connection': 'keep-alive'
  };

  try {
    const url = 'https://komiktap.info/';
    
    const { data } = await axios.get(url, { kepala });
    const $ = cheerio.load(data);

    let results = [];

    $('.listupd .bs').each((i, el) => {
      const title = $(el).find('.tt').text().trim();
      const url = $(el).find('a').attr('href');
      const thumbnail = $(el).find('img').attr('src');
      const chapter = $(el).find('.epxs').text().trim();
      
      results.push({
        title,
        url,
        thumbnail,
        chapter
      });
    });

    results = results.sort(() => Math.random() - 0.5);

    return {
      status: 200,
      creator: "Hello Line",
      data: results,
      message: `Berhasil menemukan ${results.length} komik random`
    };

  } catch (error) {
    return {
      status: error.response?.status || 500,
      data: [],
      message: error.message
    };
  }
};

// Versi Query
const komiktapsrcq = async (query) => {
  const kepala = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://komiktap.info/',
    'Connection': 'keep-alive'
  };
  
  try {
    const url = query ? `https://komiktap.info/?s=${encodeURIComponent(query)}` : 'https://komiktap.info/';
    
    const { data } = await axios.get(url, { kepala });
    const $ = cheerio.load(data);

    const results = [];
    
    $('.listupd .bs').each((i, el) => {
      const title = $(el).find('.tt').text().trim();
      const url = $(el).find('a').attr('href');
      const thumbnail = $(el).find('img').attr('src');
      const chapter = $(el).find('.epxs').text().trim();
      
      results.push({
        title,
        url,
        thumbnail,
        chapter
      });
    });

    if (query) {
      $('.listupd .bsx').each((i, el) => {
        const title = $(el).find('.tt').text().trim();
        const url = $(el).find('a').attr('href');
        const thumbnail = $(el).find('img').attr('src');
        const type = $(el).find('.type').text().trim();
        
        results.push({
          title,
          url,
          thumbnail,
          type
        });
      });
    }

    return {
      status: 200,
      creator: "Hello Line",
      data: results,
      message: `Berhasil menemukan ${results.length} hasil`
    };

  } catch (error) {
    return {
      status: error.response?.status || 500,
      data: [],
      message: error.message
    };
  }
};

async function SimSimi(text, language = 'id') {
    const { data } = await axios.post("https://api.simsimi.vn/v1/simtalk", new URLSearchParams({
        text,
        lc: language
    }).toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    return data.message;
}

function generateRandomPasswordMail(prefix = 'wira-', length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = prefix;
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    return password;
}

function generateEmailMail(namePrefix) {
    return `${namePrefix}@edny.net`;
}

async function getTokenMail(email, password) {
    const url = 'https://api.mail.tm/token';
    const headers = {
        'accept': 'application/json',
        'content-type': 'application/json',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15'
    };

    const payload = {
        address: email,
        password: password,
    };

    const response = await axios.post(url, payload, { headers });
    return response.data.token;
}

async function createAccountMail(namePrefix) {
    const email = generateEmailMail(namePrefix);
    const password = generateRandomPasswordMail();

    const url = 'https://api.mail.tm/accounts';
    const headers = {
        'accept': 'application/json',
        'content-type': 'application/json',
        'origin': 'https://ins.neastooid.xyz',
        'referer': 'https://ins.neastooid.xyz/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15'
    };

    const payload = {
        address: email,
        password: password,
    };

    try {
        const response = await axios.post(url, payload, { headers });
        const token = await getTokenMail(email, password);

        return {
            email: response.data.address,
            password: password,
            id: response.data.id,
            token: token,
        };
    } catch (error) {
        if (error.response) {
            console.error('Error creating account:', error.response.data);
            if (error.response.status === 422 && error.response.data.violations) {
                const emailViolation = error.response.data.violations.find(v => v.propertyPath === 'address');
                if (emailViolation) {
                    throw new Error(`Failed to create account, ${emailViolation.message}.\nSilahkan gunakan username lainnya.`);
                }
            }
            throw new Error('Failed to create account. Please check the input data.');
        } else if (error.request) {
            console.error('No response received:', error.request);
            throw new Error('No response from server. Please try again later.');
        } else {
            console.error('Error:', error.message);
            throw new Error('An error occurred while creating the account.');
        }
    }
}

async function cekPesanMail(token) {
    const url = 'https://api.mail.tm/messages?page=1';
    const headers = {
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
        'origin': 'https://ins.neastooid.xyz',
        'pragma': 'no-cache',
        'referer': 'https://ins.neastooid.xyz/',
        'sec-ch-ua': '"Safari";v="15.3", "Not:A-Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15'
    };

    try {
        const response = await axios.get(url, { headers });
        const messages = response.data;

        return messages.map(msg => ({
            from: msg.from.address,
            subject: msg.subject
        }));
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages. Please check the token and try again.');
    }
}

async function gempa() {
	return new Promise(async(resolve,reject) => {
		axios.get('https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg')
		.then(({ data }) => {
			const $ = cheerio.load(data)
			const drasa = [];
			$('table > tbody > tr:nth-child(1) > td:nth-child(6) > span').get().map((rest) => {
				dir = $(rest).text();
				drasa.push(dir.replace('\t', ' '))
			})
			teks = ''
			for(let i=0; i<drasa.length; i++){
				teks += drasa[i] + '\n'
			}
			const rasa = teks
			const format = {
				imagemap : $('div.modal-body > div > div:nth-child(1) > img').attr('src'),
				magnitude : $('table > tbody > tr:nth-child(1) > td:nth-child(4)').text(),
				kedalaman: $('table > tbody > tr:nth-child(1) > td:nth-child(5)').text(),
				wilayah: $('table > tbody > tr:nth-child(1) > td:nth-child(6) > a').text(),
				waktu: $('table > tbody > tr:nth-child(1) > td:nth-child(2)').text(),
				lintang_bujur: $('table > tbody > tr:nth-child(1) > td:nth-child(3)').text(),
				dirasakan: rasa
			}
			const result = {
				source: 'www.bmkg.go.id',
				data: format
			}
			resolve(result)
		})
		.catch(reject)
	})
};

async function gempa() {
	return new Promise(async(resolve,reject) => {
		axios.get('https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg')
		.then(({ data }) => {
			const $ = cheerio.load(data)
			const drasa = [];
			$('table > tbody > tr:nth-child(1) > td:nth-child(6) > span').get().map((rest) => {
				dir = $(rest).text();
				drasa.push(dir.replace('\t', ' '))
			})
			teks = ''
			for(let i=0; i<drasa.length; i++){
				teks += drasa[i] + '\n'
			}
			const rasa = teks
			const format = {
				imagemap : $('div.modal-body > div > div:nth-child(1) > img').attr('src'),
				magnitude : $('table > tbody > tr:nth-child(1) > td:nth-child(4)').text(),
				kedalaman: $('table > tbody > tr:nth-child(1) > td:nth-child(5)').text(),
				wilayah: $('table > tbody > tr:nth-child(1) > td:nth-child(6) > a').text(),
				waktu: $('table > tbody > tr:nth-child(1) > td:nth-child(2)').text(),
				lintang_bujur: $('table > tbody > tr:nth-child(1) > td:nth-child(3)').text(),
				dirasakan: rasa
			}
			const result = {
				source: 'www.bmkg.go.id',
				data: format
			}
			resolve(result)
		})
		.catch(reject)
	})
};

async function islamicnews() {
  try {
    const { data } = await axios.get("https://islami.co/artikel-terkini/");
    const $ = cheerio.load(data);
    const articles = [];

    $("article").each((index, element) => {
      const summary = $(element).find(".meta-top").text().trim();
      const title = $(element).find(".entry-title a").text().trim();
      const link = $(element).find(".entry-title a").attr("href");

      articles.push({ summary, title, link });
    });

    return articles;
  } catch (error) {
    console.error("Error scraping data:", error);
    throw new Error("Gagal mengambil berita terbaru.");
  }
}

async function islamicsearch(query) {
  try {
    const url = `https://islami.co/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const results = [];

    const count = $(".counter strong").text().trim();
    const summary = `Hasil ditemukan: ${count} artikel`;

    $(".content-excerpt").each((_, el) => {
      const title = $(el).find(".entry-title a").text().trim();
      const link = $(el).find(".entry-title a").attr("href");
      const category = $(el).find(".meta-top .post-term a").text().trim();
      const author = $(el).find(".meta-bottom .post-author a").text().trim();
      const date = $(el).find(".meta-bottom .post-date").text().trim();
      const image = $(el).find("picture img").attr("src") || $(el).find("picture img").attr("data-src");

      results.push({ title, link, category, author, date, image });
    });

    return { summary, results };
  } catch (error) {
    console.error("Error:", error.message);
    throw new Error("Gagal mencari berita berdasarkan query.");
  }
}

async function islamicdetail(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Mengambil informasi yang relevan dari halaman
        const title = $('h1.entry-title').text().trim();
        const author = $('.post-author a').text().trim();
        const date = $('.post-date').text().trim();
        const content = $('.entry-content p').map((i, el) => $(el).text().trim()).get().join('\n\n'); // Mengambil konten sebagai teks dan memisahkan paragraf
        const image = $('.entry-media img').attr('src'); // Mengambil URL gambar

        // Mengembalikan informasi dalam format JSON
        return {
            title,
            author,
            date,
            content,
            image,
            link: url
        };
    } catch (error) {
        console.error('Error fetching Islamic detail:', error);
        throw new Error('Could not fetch Islamic detail');
    }
}

async function RumahMisteri() {
    const random = async () => {
        try {
            let url = "https://rumahmisteri.com/";
            let { data } = await axios.get(url);
            let $ = cheerio.load(data);
            let articles = [];

            $(".archive-grid-post-wrapper article").each((i, el) => {
                let title = $(el).find("h2.entry-title a").text().trim();
                let link = $(el).find("h2.entry-title a").attr("href");
                let image = $(el).find(".post-thumbnail img").attr("src");
                let category = $(el).find(".post-cats-list a").text().trim();
                let date = $(el).find(".posted-on time").attr("datetime");

                if (title && link) {
                    articles.push({ title, link, image, category, date });
                }
            });

            if (articles.length === 0) {
                return "Tidak ada artikel yang ditemukan.";
            }

            let randomArticle = articles[Math.floor(Math.random() * articles.length)];
            return randomArticle;
        } catch (error) {
            return `Terjadi kesalahan: ${error.message}`;
        }
    };

    return { random };
}

async function DetailRumahMisteri(postLink) {
    try {
        const { data } = await axios.get(postLink);
        const $ = cheerio.load(data);
        const title = $('h1.entry-title').text().trim();
        const description = $('meta[name="description"]').attr('content');
        const image = $('meta[property="og:image"]').attr('content');
        const category = $('meta[property="article:section"]').attr('content');
        const date = $('time.entry-date').attr('datetime');
        const author = $('span.author.vcard a').text().trim();
        const content = $('.entry-content').find('p').map((i, el) => {
            return $(el).text().trim();
        }).get().join('\n');

        return {
            title,
            description,
            image,
            category,
            date,
            author,
            content,
            link: postLink
        };
    } catch (error) {
        return `Terjadi kesalahan: ${error.message}`;
    }
}

async function cariGC(query) {
    try {
        const { data } = await axios.get(`https://groupsor.link/group/searchmore/${query.replace(' ', '-')}`);
        const $ = cheerio.load(data);
        const result = [];

        $('.maindiv').each((i, el) => {
            result.push({
                title: $(el).find('img').attr('alt').trim(),
                thumb: $(el).find('img').attr("src").trim(),
            });
        });

        $('div.post-info-rate-share > .joinbtn').each((i, el) => {
            result[i].link = $(el).find('a').attr("href").trim().replace('https://groupsor.link/group/join/', 'https://chat.whatsapp.com/');
        });

        $('.post-info').each((i, el) => {
            result[i].desc = $(el).find('.descri').text().replace('... continue reading', '.....').trim();
        });
        return result;
    } catch (e) {
        console.error("Error fetching data:", e);
        return [];
    }
}

const soundCloudSearch = async (query) => {
	try {
		const url = `https://m.soundcloud.com/search?q=${encodeURIComponent(query)}`;
		const { data } = await axios.get(url);
		const $ = cheerio.load(data);
		let results = [];
		$('.List_VerticalList__2uQYU li').each((index, element) => {
			const title = $(element).find('.Cell_CellLink__3yLVS').attr('aria-label');
			const musicUrl = 'https://m.soundcloud.com' + $(element).find('.Cell_CellLink__3yLVS').attr('href');
			if (title && musicUrl) {
				results.push({ title, url: musicUrl });
			}
		});
		return results.slice(0, 5);
	} catch (error) {
		console.error('Error fetching SoundCloud data:', error);
		return [];
	}
};

function playstore(search) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data, status } = await axios.get(`https://play.google.com/store/search?q=${search}&c=apps`)
			const hasil = []
			const $ = cheerio.load(data)
			$('.ULeU3b > .VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.Y8RQXd > .VfPpkd-aGsRMb > .VfPpkd-EScbFb-JIbuQc.TAQqTe > a').each((i, u) => {
				const linkk = $(u).attr('href')
				const nama = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > .DdYX5').text()
				const developer = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > .wMUdtb').text()
				const img = $(u).find('.j2FCNc > img').attr('src')
				const rate = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > div').attr('aria-label')
				const rate2 = $(u).find('.j2FCNc > .cXFu1 > .ubGTjb > div > span.w2kbF').text()
				const link = `https://play.google.com${linkk}`
				hasil.push({
					link: link,
					nama: nama ? nama : 'No name',
					developer: developer ? developer : 'No Developer',
					img: img ? img : 'https://i.ibb.co/G7CrCwN/404.png',
					rate: rate ? rate : 'No Rate',
					rate2: rate2 ? rate2 : 'No Rate',
					link_dev: `https://play.google.com/store/apps/developer?id=${developer.split(" ").join('+')}`
				})
			})
			if (hasil.every(x => x === undefined))
			return resolve({
				message: 'Tidak ada result!'
			})
			resolve(hasil)
		} catch (err) {
			console.error(err)
		}
	})
};

function happymod(query) {
    return new Promise((resolve, reject) => {
        const baseUrl = 'https://www.happymod.com/';
        axios.get(`${baseUrl}search.html?q=${query}`)
        .then(({ data }) => {
            const $ = cheerio.load(data);
            const hasil = [];
            $("div.pdt-app-box").each((i, elem) => {
                hasil.push({
                    title: $(elem).find("a").text().trim(),
                    icon: $(elem).find("img.lazy").attr('data-original'),
                    rating: $(elem).find("span").text(),
                    link: baseUrl + $(elem).find("a").attr('href')
                });
            });
            resolve(hasil);
        })
        .catch(reject);
    });
}

module.exports = { BingImageSearch, searchWikipedia, bingSearch, bingVideoSearch, pinterest, Cerpen, processImage, downloadInstagram, terabox, generateImageWithText, spotifySearch, capcutdl, douyindl, capcutdl, spotifydl, pindl, mediafiredl, GDrive, CatBox, takeScreenshot, wikiImage, sfilesrc, srcLyrics, igstalk, npmStalk, videydl, komiktapsrc, komiktapsrcq, SimSimi, cekPesanMail, createAccountMail, getTokenMail, gempa, islamicnews, islamicsearch, islamicdetail, RumahMisteri, DetailRumahMisteri, cariGC, playstore, happymod, soundCloudSearch }
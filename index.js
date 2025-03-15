const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { updateUsage, tambahPengunjung, databaseMiddleware, fetchGitHubFile, getDatabase, saveDatabase, authenticateToken, getTodayDate } = require('./lib/untils')
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const JWT_SECRET = "CALLLINE";
const EMAIL_USER = "lineaja03@gmail.com";
const EMAIL_PASS = "zlqt dptn knxm xmym";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const PLANS = {
  basic: { limit: 100, duration: null },
  standard: { limit: 500, duration: 15 },
  premium: { limit: 1500, duration: 30 }
};

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function requireOwner(req, res, next) {
  if (!req.user.isOwner) {
    return res.status(403).json({ message: "Hanya owner yang dapat mengakses ini" });
  }
  next();
}

// Routes
app.get("/", async (req, res) => {
    const db = await getDatabase();
    db.visitor = (db.visitor || 0) + 1;
    await saveDatabase(db);
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", async (req, res) => {
    await tambahPengunjung();
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/auth/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "daftar.html"));
});

app.get("/auth/verif", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "verif.html"));
});

app.get("/auth/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/deposit", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "kurva.html"));
});

app.get("/user/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get('/user/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/user/credit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/credit.html'));
});

app.get("/user/upgrade", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "upgrade.html"));
});

// Api Utama ( Jangan Otak Atik )

// Routes
app.post("/api/register", databaseMiddleware, async (req, res) => {
  const { username, password, email, phone } = req.body;
  const isFirstUser = req.db.users.length === 0;

  if (!username || !password || !email || !phone) {
    return res.status(400).json({ message: "Semua field harus diisi" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Format email tidak valid" });
  }

  if (req.db.users.some(u => u.email === email)) {
    return res.status(409).json({ message: "Email sudah terdaftar" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let otp = null;
    let otpExpiration = null;

    if (!isFirstUser) {
      otp = generateOTP();
      otpExpiration = new Date(Date.now() + 15 * 60 * 1000);
    }

    const newUser = {
      id: crypto.randomUUID(),
      username,
      password: hashedPassword,
      email,
      phone,
      apikey: crypto.randomBytes(16).toString("hex"),
      limit: isFirstUser ? Number.MAX_SAFE_INTEGER : PLANS.basic.limit,
      plan: isFirstUser ? 'owner' : 'basic',
      planExpiresAt: null,
      emailVerified: isFirstUser, 
      isAdmin: isFirstUser,
      isOwner: isFirstUser,
      createdAt: new Date().toISOString(),
      otp,
      otpExpiration
    };

    if (isFirstUser) {
      const mailOptions = {
        from: EMAIL_USER,
        to: email,
        subject: 'Owner Account Created',
        html: `<h1>Owner Account Details</h1>
              <p>Username: ${username}</p>
              <p>Password: ${password}</p>
              <p>API Key: ${newUser.apikey}</p>`
      };
      await transporter.sendMail(mailOptions);
    } else {
      const mailOptions = {
        from: EMAIL_USER,
        to: email,
        subject: 'Verifikasi Email',
        html: `<p>Kode OTP Anda: ${otp}</p>`
      };
      await transporter.sendMail(mailOptions);
    }

    req.db.users.push(newUser);
    await saveDatabase(req.db);

    res.status(201).json({
      message: isFirstUser ? "Owner account created successfully" : "Registrasi berhasil, silakan verifikasi email",
      email: newUser.email
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal melakukan registrasi" });
  }
});

app.post("/api/verify-email", databaseMiddleware, async (req, res) => {
  const { email, otp } = req.body;
  const user = req.db.users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ message: "Email tidak ditemukan" });
  }

  if (user.emailVerified) {
    return res.status(400).json({ message: "Email sudah terverifikasi" });
  }

  if (!user.otp || !user.otpExpiration) {
    return res.status(400).json({ message: "OTP belum dikirim, silakan minta ulang" });
  }

  if (new Date() > new Date(user.otpExpiration)) {
    return res.status(400).json({ message: "Kode OTP telah kadaluarsa, silakan minta ulang" });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ message: "Kode OTP tidak valid" });
  }

  user.emailVerified = true;
  user.otp = null;
  user.otpExpiration = null;
  await saveDatabase(req.db);

  res.json({ message: "Email berhasil diverifikasi" });
});

app.post("/api/resend-otp", databaseMiddleware, async (req, res) => {
  const { email } = req.body;
  const user = req.db.users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ message: "Email tidak terdaftar" });
  }

  if (user.emailVerified) {
    return res.status(400).json({ message: "Email sudah terverifikasi" });
  }

  const newOTP = generateOTP();
  const otpExpiration = new Date(Date.now() + 15 * 60 * 1000);

  try {
    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: 'Kode OTP Baru',
  text: `Kode OTP baru Anda: ${newOTP}`,
  html: `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi Email</title>
      <style>
          body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
          }
          .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
          }
          .header {
              background-color: #007bff;
              padding: 20px;
              text-align: center;
          }
          .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 24px;
          }
          .content {
              padding: 30px;
              text-align: center;
          }
          .content p {
              font-size: 16px;
              color: #333333;
              line-height: 1.5;
          }
          .otp-code {
              font-size: 32px;
              color: #007bff;
              font-weight: bold;
              margin: 20px 0;
          }
          .button {
              display: inline-block;
              padding: 12px 25px;
              margin: 20px 0;
              background-color: #007bff;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              font-size: 16px;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              font-size: 12px;
              color: #999999;
          }
          @media only screen and (max-width: 600px) {
              .container {
                  width: 100%;
                  margin: 10px;
              }
              .header h1 {
                  font-size: 20px;
              }
              .content p, .button {
                  font-size: 14px;
              }
              .otp-code {
                  font-size: 28px;
              }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>Verifikasi Email Anda</h1>
          </div>
          <div class="content">
              <p>Terima kasih telah mendaftar. Gunakan kode OTP di bawah ini untuk memverifikasi email Anda:</p>
              <div class="otp-code">${newOTP}</div>
              <p>Kode OTP ini berlaku selama 10 menit. Jika Anda tidak melakukan permintaan ini, harap abaikan email ini.</p>
              <a href="https://https://api-linecloud.digital-server.biz.id/auth/verify" class="button">Verifikasi Sekarang</a>
              <hr style="border: none; border-top: 1px solid #dddddd; margin: 20px 0;">
              <p style="font-size: 12px;">Jika ada pertanyaan, silakan hubungi kami di <a href="mailto:wiraliwirya222210@gmail.com" style="color: #007bff; text-decoration: none;">support@yourdomain.com</a></p>
          </div>
          <div class="footer">
              &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
          </div>
      </div>
  </body>
  </html>
  `
    };
    
    await transporter.sendMail(mailOptions);
    
    user.otp = newOTP;
    user.otpExpiration = otpExpiration;
    await saveDatabase(req.db);

    res.json({ message: "OTP baru telah dikirim ke email Anda" });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengirim OTP" });
  }
});

app.post("/api/login", databaseMiddleware, async (req, res) => {
  const { email, password } = req.body;
  const user = req.db.users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Kredensial tidak valid" });
  }

  if (!user.emailVerified && !user.isOwner) {
    return res.status(403).json({ message: "Email belum diverifikasi" });
  }

  const token = jwt.sign(
    { userId: user.apikey, email: user.email, plan: user.plan },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "Login berhasil",
    token,
    user: {
      username: user.username,
      email: user.email,
      apikey: user.apikey,
      limit: user.limit,
      plan: user.plan,
      isAdmin: user.isAdmin,
      isOwner: user.isOwner,
      planExpiresAt: user.planExpiresAt
    }
  });
});

app.get("/api/profile", authenticateToken, databaseMiddleware, async (req, res) => {
  const user = req.db.users.find(u => u.apikey === req.user.userId);

  if (!user) {
    return res.status(404).json({ message: "Pengguna tidak ditemukan" });
  }

  const baseProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    apikey: user.apikey,
    limit: user.limit,
    plan: user.plan,
    registeredAt: user.createdAt
  };

  const ownerProfile = {
    ...baseProfile,
    isOwner: true,
    apikey: user.apikey,
    totalUsers: req.db.users.length,
    systemStatus: "active"
  };

  const regularProfile = {
    ...baseProfile,
    ...(user.plan !== 'basic' && { planExpiresAt: user.planExpiresAt })
  };

  res.json(user.isOwner ? ownerProfile : regularProfile);
});

app.post("/api/upgrade-plan", authenticateToken, databaseMiddleware, async (req, res) => {
  const { plan } = req.body;
  const user = req.db.users.find(u => u.apikey === req.user.userId);

  if (!PLANS[plan]) {
    return res.status(400).json({ message: "Plan tidak valid" });
  }

  const newExpiry = plan === 'basic' 
    ? null 
    : new Date(Date.now() + PLANS[plan].duration * 86400000);

  user.plan = plan;
  user.limit = PLANS[plan].limit;
  user.planExpiresAt = newExpiry;

  if (plan !== 'basic') {
    user.apikey = crypto.randomBytes(16).toString("hex");
  }

  await saveDatabase(req.db);

  res.json({
    message: `Upgrade ke plan ${plan} berhasil`,
    newApiKey: plan !== 'basic' ? user.apikey : undefined,
    plan: user.plan,
    limit: user.limit,
    planExpiresAt: user.planExpiresAt
  });
});

app.get("/api/history-request", async (req, res) => {
    try {
        const database = await getDatabase();
        res.json({ historyRequest: database.historyRequest });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data history request!", error: error.message });
    }
});

app.get("/api/total-request", async (req, res) => {
    try {
        const database = await getDatabase();
        res.json({ totalRequest: database.count });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data total request!", error: error.message });
    }
});

app.get("/api/request-today", async (req, res) => {
    try {
        const database = await getDatabase();
        const today = getTodayDate();
        const requestToday = database.historyRequest[today] || 0;
        res.json({ requestToday });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data request hari ini!", error: error.message });
    }
});

app.get("/api/total-visitor", async (req, res) => {
    try {
        const database = await getDatabase();
        res.json({ totalVisitor: database.visitor });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data jumlah pengunjung!", error: error.message });
    }
});

app.get("/api/total-users", async (req, res) => {
    try {
        const database = await getDatabase();
        const totalUsers = database.users.length;
        res.json({ totalUsers });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data jumlah pengguna!", error: error.message });
    }
});


let depositDataStore = [];
app.post("/api/deposit", async (req, res) => {
    const { nominal, method, reff_id } = req.body;
    if (!nominal || !method || !reff_id) return res.status(400).json({ error: "Semua data harus diisi" });
    try {
        const response = await axios.post("https://forestapi.web.id/api/h2h/deposit/create", {
            nominal,
            method,
            reff_id,
            api_key: API_KEY
        });
        if (response.data.status === "success") {
            let depositData = {
                id: response.data.data.id,
                reff_id,
                nominal,
                method,
                status: "pending",
                qr_url: response.data.data.qr_image_url,
                expired_at: response.data.data.expired_at
            };
            depositDataStore.push(depositData);
            res.json({ success: true, data: depositData });
        } else {
            res.status(400).json({ error: response.data.message || "Gagal membuat deposit" });
        }
    } catch (error) {
        console.error("❌ Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Server error", detail: error.response ? error.response.data : error.message });
    }
});

app.get("/api/deposit/status/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`https://forestapi.web.id/api/h2h/deposit/status?id=${id}&api_key=${API_KEY}`);
        if (response.data.status === "success") {
            let depositIndex = depositDataStore.findIndex(d => d.id === id);
            if (depositIndex !== -1) {
                depositDataStore[depositIndex].status = response.data.data.status;
            }
            res.json({ success: true, data: response.data.data });
        } else {
            res.status(400).json({ error: response.data.message || "Gagal cek status deposit" });
        }
    } catch (error) {
        console.error("❌ Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Server error", detail: error.response ? error.response.data : error.message });
    }
});

// End Point
app.use('/api/search', require('./api/search'));
app.use('/api/download', require('./api/download'));
app.use('/api/stalk', require('./api/stalk'));
app.use('/api/tools', require('./api/tools'));
app.use('/api/maker', require('./api/maker'));
app.use('/api/anime', require('./api/anime'));
app.use('/api/pay', require('./api/orkut'));

app.get('/api/total-endpoints', (req, res) => {
    let total = 0;
    app._router.stack.forEach(layer => {
        if (layer.route) {
            total++;
        } else if (layer.handle && layer.handle.stack) {
            total += layer.handle.stack.filter(r => r.route).length;
        }
    });
    res.send(total.toString());
});

// == End Wak

if (require.main === module) {
    app.listen(3000, () => console.log("Server berjalan di port 3000"));

    setInterval(async () => {
        const db = await getDatabase();
        const today = new Date();
        let needsUpdate = false;

        db.users = db.users.map(user => {
            if (user.plan === 'owner' || user.status === 'owner') {
                return user;
            }

            if (user.lastReset !== getTodayDate()) {
                if (user.plan !== 'basic' && new Date(user.planExpiresAt) < today) {
                    user.plan = 'basic';
                    user.limit = PLANS.basic.limit;
                    user.planExpiresAt = null;
                } else {
                    user.limit = PLANS[user.plan].limit;
                }

                user.lastReset = getTodayDate();
                needsUpdate = true;
            }
            return user;
        });

        if (needsUpdate) {
            await saveDatabase(db);
            console.log("Limit dan plan pengguna telah diriset");
        }
    }, 86400000);
}
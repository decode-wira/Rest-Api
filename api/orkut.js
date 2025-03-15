const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const QRCode = require('qrcode');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { updateUsage } = require('../lib/untils')
const creator = 'Hello Line'

function convertCRC16(str) {
    let crc = 0xFFFF;
    const strlen = str.length;
    for (let c = 0; c < strlen; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    let hex = crc & 0xFFFF;
    hex = ("000" + hex.toString(16).toUpperCase()).slice(-4);
    return hex;
}

function generateTransactionId() {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return 'QR-' + randomPart;
}

function generateExpirationTime() {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    return expirationTime;
}

async function uploadToCloudMini(filePath) {
    try {
        const file_buffer = fs.readFileSync(filePath);
        const file_type = filePath.split('.').pop();
        const file_name = filePath.split('/').pop();
        const unique_id = Math.random().toString(36).substring(2, 10) + (file_buffer.length + file_type + file_name).length;
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), `${unique_id}.${file_type}`);
        const response = await axios.post('https://files.cloudmini.net/upload', form, {
            headers: { ...form.getHeaders() }
        });
        const { filename, expiry_time } = response.data;
        return {
            url: `https://files.cloudmini.net/download/${filename}`,
            expired: expiry_time
        };
    } catch (err) {
        console.error('🚫 Upload to CloudMini Failed:', err);
        throw err;
    }
}

async function createQRIS(amount, codeqr) {
    try {
        let qrisData = codeqr.slice(0, -4);
        const step1 = qrisData.replace("010211", "010212");
        const step2 = step1.split("5802ID");
        amount = amount.toString();
        let uang = "54" + ("0" + amount.length).slice(-2) + amount;
        uang += "5802ID";
        const result = step2[0] + uang + step2[1] + convertCRC16(step2[0] + uang + step2[1]);
        const qrDataUri = await QRCode.toDataURL(result);
        return {
            transactionId: generateTransactionId(),
            amount: amount,
            expirationTime: generateExpirationTime(),
            qrImageUrl: qrDataUri 
        };
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
}

router.get('/okt-deposit', async (req, res) => {
    const { amount, qrcode, apikey } = req.query;
    if (!amount) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'amount' harus di isi!" 
        });
    }
    if (!qrcode) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'qrcode' harus di isi!" 
        });
    }
    if (!apikey) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'apikey' diperlukan!"
      });
    }
    const apiCheck = await updateUsage(apikey);
    if (!apiCheck.success) {
      return res.status(403).json({
        status: false,
        creator: creator,
        error: apiCheck.message
      });
    }
    try {
        const qrData = await createQRIS(amount, code);
        res.json({ 
            status: true,
            creator: creator,
            creator: creator,
            ...qrData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/okt-status', async (req, res) => {
    const { merchant, keyorkut, apikey } = req.query;
    if (!merchant) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'merchant' harus di isi!" 
        });
    }
    if (!keyorkut) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'keyorkut' harus di isi!" 
        });
    }
    if (!apikey) {
      return res.status(400).json({
        status: false,
        creator: creator,
        error: "Parameter 'apikey' diperlukan!"
      });
    }
    const apiCheck = await updateUsage(apikey);
    if (!apiCheck.success) {
      return res.status(403).json({
        status: false,
        creator: creator,
        error: apiCheck.message
      });
    }
    try {
        const url = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
        const response = await axios.get(url);
        if (!response.data || response.data.status !== 'success') {
            return res.status(500).json({ status: false, message: 'Gagal mengambil data transaksi' });
        }
        const transactions = response.data.data;
        if (transactions.length === 0) {
            return res.json({ status: true, message: 'Belum ada transaksi terbaru' });
        }
        const latestTransaction = transactions[0];
        res.json({
            status: true,
            creator: creator,
            latestTransaction
        });
    } catch (error) {
        console.error('Error fetching latest payment:', error);
        res.status(500).json({ status: false, message: 'Terjadi kesalahan saat mengecek transaksi terbaru' });
    }
});

router.get('/okt-mutasi', async (req, res) => {
    const { merchant, keyorkut, apikey } = req.query;
    if (!merchant) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'merchant' harus di isi!" 
        });
    }
    if (!keyorkut) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'keyorkut' harus di isi!" 
        });
    }
    if (!apikey) {
      return res.status(400).json({
        status: false,
        creator: creator,
        error: "Parameter 'apikey' diperlukan!"
      });
    }
    const apiCheck = await updateUsage(apikey);
    if (!apiCheck.success) {
      return res.status(403).json({
        status: false,
        creator: creator,
        error: apiCheck.message
      });
    }
    try {
        const url = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
        const response = await axios.get(url);
        if (!response.data || response.data.status !== 'success') {
            return res.status(500).json({ status: false, message: 'Gagal mengambil data transaksi' });
        }
        const transactions = response.data.data;
        if (transactions.length === 0) {
            return res.json({ status: true, message: 'Tidak ada transaksi terbaru' });
        }
        res.json({
            status: true,
            creator: creator,
            transactions
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ status: false, message: 'Terjadi kesalahan saat mengecek mutasi' });
    }
});

router.get('/okt-saldoqr', async (req, res) => {
    const { merchant, keyorkut, apikey } = req.query;
    if (!merchant) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'merchant' harus di isi!" 
        });
    }
    if (!keyorkut) {
        return res.status(400).json({
            status: false,
            creator: creator,
            error: "Prameter 'keyorkut' harus di isi!" 
        });
    }
    if (!apikey) {
      return res.status(400).json({
        status: false,
        creator: creator,
        error: "Parameter 'apikey' diperlukan!"
      });
    }
    const apiCheck = await updateUsage(apikey);
    if (!apiCheck.success) {
      return res.status(403).json({
        status: false,
        creator: creator,
        error: apiCheck.message
      });
    }
    try {
        const url = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
        const response = await axios.get(url);
        if (!response.data || response.data.status !== 'success') {
            return res.status(500).json({ status: false, message: 'Gagal mengambil data saldo' });
        }
        const transactions = response.data.data;
        if (transactions.length === 0) {
            return res.json({ status: true, message: 'Saldo tidak tersedia' });
        }
        const latestBalance = transactions[0].balance;
        res.json({
            status: true,
            creator: creator,
            balance: latestBalance
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ status: false, message: 'Terjadi kesalahan saat mengecek saldo' });
    }
});

module.exports = router;
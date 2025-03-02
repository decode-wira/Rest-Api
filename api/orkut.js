const express = require('express');
const axios = require('axios');
const router = express.Router();
const { updateUsage } = require('../index.js')

const {
  convertCRC16,
  generateTransactionId,
  generateExpirationTime,
  elxyzFile,
  generateQRIS,
  createQRIS,
  checkQRISStatus
} = require('../orkut.js') 

const validateApiKey = async (req, res, next) => {
  const apikey = req.query.apikey;
  if (!apikey) return res.status(403).json({ message: 'API key tidak ditemukan' });

  const result = await updateUsage(apikey);
  if (!result.success) return res.status(403).json({ message: result.message });

  next();
};

const validateInput = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (!req.query[field]) {
        return res.status(400).json({ message: `Parameter '${field}' wajib diisi` });
      }
    }
    next();
  };
};

router.get(
  '/createpayment',
  validateApiKey,
  validateInput(['amount', 'codeqr']),
  async (req, res) => {
    const { amount, codeqr } = req.query;

    try {
      const qrData = await createQRIS(amount, codeqr);
      res.json({ status: true, creator: "Hello Line", result: qrData });
    } catch (error) {
      res.status(500).json({
        status: 500,
        creator: "Hello Line",
        result: `Error: ${error.message}`,
      });
    }
  }
);

router.get(
  '/cekstatus',
  validateApiKey,
  validateInput(['merchant', 'keyorkut']),
  async (req, res) => {
    const { merchant, keyorkut } = req.query;

    try {
      const apiUrl = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
      const response = await axios.get(apiUrl);
      const result = response.data;

      const latestTransaction = result.data?.length > 0 ? result.data[0] : null;

      setTimeout(() => {
        if (latestTransaction) {
          res.json(latestTransaction);
        } else {
          res.json({ message: "Tidak ada transaksi ditemukan." });
        }
      }, 5000);
    } catch (error) {
      res.status(500).json({
        status: 500,
        creator: "Hello Line",
        result: `Error: ${error.message}`,
      });
    }
  }
);

router.get(
  '/cekmutasi',
  validateApiKey,
  validateInput(['merchant', 'keyorkut']),
  async (req, res) => {
    const { merchant, keyorkut } = req.query;

    try {
      const apiUrl = `https://gateway.okeconnect.com/api/mutasi/qris/${merchant}/${keyorkut}`;
      const response = await axios.get(apiUrl);
      const result = response.data;

      if (result?.data?.length > 0) {
        res.json(result.data[0]);
      } else {
        res.json({ message: "Tidak ada transaksi ditemukan." });
      }
    } catch (error) {
      res.status(500).json({
        status: 500,
        creator: "Hello Line",
        result: `Error: ${error.message}`,
      });
    }
  }
);

module.exports = router;
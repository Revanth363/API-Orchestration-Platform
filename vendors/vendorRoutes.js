const express = require('express');
const router = express.Router();
const vendorHandlers = require('./vendorHandlers');

// Vendor A - PAN verification
router.post('/vendorA/verify-pan', vendorHandlers.verifyPanVendorA);

// Vendor B - PAN verification (different format)
router.post('/vendorB/verify-pan', vendorHandlers.verifyPanVendorB);

// Vendor C - Aadhaar verification
router.post('/vendorC/verify-aadhaar', vendorHandlers.verifyAadhaarVendorC);

// Vendor D - OCR extraction
router.post('/vendorD/ocr-extract', vendorHandlers.extractOcrVendorD);

// Vendor E - Fraud detection
router.post('/vendorE/fraud-detect', vendorHandlers.detectFraudVendorE);

// Vendor F - Face match
router.post('/vendorF/face-match', vendorHandlers.matchFaceVendorF);

module.exports = router;
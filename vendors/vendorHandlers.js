// these simulate real third-party vendor APIs
// in production these would be actual external services

const vendorHandlers = {

    // Vendor A - PAN verification
    // expects { panNumber, fullName }
    verifyPanVendorA(req, res) {
        const { panNumber, fullName } = req.body;

        if (!panNumber || !fullName) {
            return res.status(400).json({
                error: 'panNumber and fullName are required'
            });
        }

        // simulate occasional vendor failure
        if (Math.random() < 0.15) {
            return res.status(503).json({
                error: 'Vendor A temporarily unavailable'
            });
        }

        const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber);

        // simulate network latency - 300ms
        setTimeout(() => {
            res.status(200).json({
                verificationStatus: isValid ? 'VALID' : 'INVALID',
                score: isValid ? 98 : 20,
                panNumber,
                fullName
            });
        }, 300);
    },

    // Vendor B - PAN verification (different format)
    // expects { documentId }
    verifyPanVendorB(req, res) {
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({
                error: 'documentId is required'
            });
        }

        // simulate occasional vendor failure
        if (Math.random() < 0.15) {
            return res.status(503).json({
                error: 'Vendor B temporarily unavailable'
            });
        }

        const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(documentId);

        // simulate network latency - 1200ms
        setTimeout(() => {
            res.status(200).json({
                result: isValid ? 'SUCCESS' : 'FAILURE',
                confidence: isValid ? 95 : 15,
                documentId
            });
        }, 1200);
    },

    // Vendor C - Aadhaar verification
    // expects { aadhaarNumber, name }
    verifyAadhaarVendorC(req, res) {
        const { aadhaarNumber, name } = req.body;

        if (!aadhaarNumber || !name) {
            return res.status(400).json({
                error: 'aadhaarNumber and name are required'
            });
        }

        // simulate occasional vendor failure
        if (Math.random() < 0.15) {
            return res.status(503).json({
                error: 'Vendor C temporarily unavailable'
            });
        }

        const isValid = /^[0-9]{12}$/.test(aadhaarNumber);

        // simulate network latency - 800ms
        setTimeout(() => {
            res.status(200).json({
                status: isValid ? 'VERIFIED' : 'FAILED',
                aadhaarNumber,
                name,
                verifiedAt: new Date().toISOString()
            });
        }, 800);
    },

    // Vendor D - OCR extraction
    // expects { documentBase64 }
    extractOcrVendorD(req, res) {
        const { documentBase64 } = req.body;

        if (!documentBase64) {
            return res.status(400).json({
                error: 'documentBase64 is required'
            });
        }

        // simulate occasional vendor failure
        if (Math.random() < 0.15) {
            return res.status(503).json({
                error: 'Vendor D temporarily unavailable'
            });
        }

        // simulate network latency - 2000ms (OCR is slow)
        setTimeout(() => {
            res.status(200).json({
                    name: 'Sample User',
                    dob: '1998-05-15',
                    documentType: 'PAN',
                    documentNumber: 'ABCDE1234F',
                    confidence: 92,
                    status: 'EXTRACTED'
                });
        }, 2000);
    },

    // Vendor E - Fraud detection
    // expects { name, documentNumber, documentType }
    detectFraudVendorE(req, res) {
        const { name, documentNumber } = req.body;

        if (!name || !documentNumber) {
            return res.status(400).json({
                error: 'name and documentNumber are required'
            });
        }

        // simulate occasional vendor failure
        if (Math.random() < 0.15) {
            return res.status(503).json({
                error: 'Vendor E temporarily unavailable'
            });
        }

        // simulate network latency - 1500ms
        setTimeout(() => {
            res.status(200).json({
                fraudScore: 12,
                riskLevel: 'LOW',
                flagged: false,
                documentNumber,
                checkedAt: new Date().toISOString()
            });
        }, 1500);
    },

    // Vendor F - Face match
    // expects { selfieBase64, documentBase64 }
    matchFaceVendorF(req, res) {
        const { selfieBase64, documentBase64 } = req.body;

        if (!selfieBase64 || !documentBase64) {
            return res.status(400).json({
                error: 'selfieBase64 and documentBase64 are required'
            });
        }

        // simulate occasional vendor failure
        if (Math.random() < 0.15) {
            return res.status(503).json({
                error: 'Vendor F temporarily unavailable'
            });
        }

        // simulate network latency - 1800ms
        setTimeout(() => {
            res.status(200).json({
                matched: true,
                similarity: 94.5,
                status: 'MATCH',
                checkedAt: new Date().toISOString()
            });
        }, 1800);
    },

    // Vendor G - Voter ID verification
// expects { voterId, name }
verifyVoterIdVendorG(req, res) {
    const { voterId, name } = req.body;

    if (!voterId || !name) {
        return res.status(400).json({
            error: 'voterId and name are required'
        });
    }

    if (Math.random() < 0.15) {
        return res.status(503).json({
            error: 'Vendor G temporarily unavailable'
        });
    }

    const isValid = /^[A-Z]{3}[0-9]{7}$/.test(voterId);

    setTimeout(() => {
        res.status(200).json({
            voterStatus: isValid ? 'VALID' : 'INVALID',
            voterName: name,
            voterId,
            constituency: 'Sample Constituency',
            verifiedAt: new Date().toISOString()
        });
    }, 600);
}
};

module.exports = vendorHandlers;
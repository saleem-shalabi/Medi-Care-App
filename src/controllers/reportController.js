const { generateEarningsReport } = require('../services/reportService');

async function getEarningsReport(req, res) {
    // Get date range and optional type from query string
    const {
        startDate,
        endDate = new Date().toISOString(), // Default end date to the current moment
        type // e.g., 'SALE', 'RENT', 'MAINTENANCE'
    } = req.query;

    // A start date is essential for any meaningful report.
    if (!startDate) {
        return res.status(400).json({ error: 'The startDate query parameter is required (e.g., YYYY-MM-DD).' });
    }

    try {
        const report = await generateEarningsReport({
            startDateISO: startDate,
            endDateISO: endDate,
            type,
        });
        res.status(200).json(report);
    } catch (err) {
        console.error("Report Generation Error:", err);
        res.status(500).json({ error: 'An error occurred while generating the earnings report.' });
    }
}

module.exports = { getEarningsReport };
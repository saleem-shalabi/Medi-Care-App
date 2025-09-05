const { createAdvertisement, getAllActiveAdvertisements } = require('../services/advertisementService');

async function setAdvertisement(req, res) {
    const { title, bio, linkUrl } = req.body;

    if (!title || !bio || !req.file) {
        return res.status(400).json({ error: 'title, bio, and an image are required.' });
    }

    try {
        const adData = { title, bio, linkUrl };
        const newAd = await createAdvertisement(adData, req.file);
        res.status(201).json({ message: 'Advertisement created successfully', advertisement: newAd });
    } catch (err) {
        console.error("Create Ad Error:", err);
        res.status(500).json({ error: 'Failed to create advertisement.' });
    }
}


async function getAllAdvertisements(req, res) {
    try {
        const ads = await getAllActiveAdvertisements(req);
        res.status(200).json(ads);
    } catch (err) {
        console.error("Get Ads Error:", err);
        res.status(500).json({ error: 'Failed to retrieve advertisements.' });
    }
}

module.exports = {
    setAdvertisement,
    getAllAdvertisements,
};
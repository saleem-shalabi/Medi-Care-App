
const { prisma } = require('../config/prisma');

async function createAdvertisement(adData, imageFile) {
    const { title, bio, linkUrl } = adData;
    const imageUrl = `/${imageFile.path.replace(/\\/g, '/')}`;

    return prisma.Advertisement.create({
        data: {
            title,
            bio,
            imageUrl,
            linkUrl,
            isActive: true, // New ads are active by default
        }
    });
}

async function getAllActiveAdvertisements(req) {
    const ads = await prisma.Advertisement.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: 'desc',
        }
    });

    for (const ad of ads) {
        ad.imageUrl = `${req.protocol}://${req.get('host')}${ad.imageUrl}`;
    }
    
    return ads;
}


module.exports = {
    createAdvertisement,
    getAllActiveAdvertisements,
};
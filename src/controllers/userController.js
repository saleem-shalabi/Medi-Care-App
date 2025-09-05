const { getUserProfileById, updateUserProfile } = require('../services/userService');

async function getUserProfile(req, res) {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    try {
        const userProfile = await getUserProfileById(id, baseUrl);
        res.status(200).json(userProfile);
    } catch (err) {
        if (err.message === 'User not found')
            return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Failed to retrieve user profile.' });
    }
}

async function updateCurrentUserProfile(req, res) {
    const userId = req.user.id;
    const { username, number, jobTitle, bio } = req.body;
    const allowedUpdates = { username, number, jobTitle, bio };
    if (req.file) {
        const imagePath = `/${req.file.path.replace(/\\/g, '/')}`;
        allowedUpdates.image = imagePath;
    }
    Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) {
            delete allowedUpdates[key];
        }
    });
    if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const updatedUser = await updateUserProfile(userId, allowedUpdates, baseUrl);
        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'This username is already in use.' });
        }
        res.status(500).json({ error: 'An error occurred while updating the profile.' });
    }
}

module.exports = {
    getUserProfile,
    updateCurrentUserProfile,
};
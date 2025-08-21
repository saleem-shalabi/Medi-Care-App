
const bcrypt = require('bcrypt');
const { deleteUserById, banUserById, unbanUserById, createUser, changeUserPasswordById, setUserRoleById, getAllUsers } = require('../services/adminService');

async function deleteUser(req, res) {
    const { id } = req.params;
    try {
        await deleteUserById(id);
        res.status(200).json({ message: 'User account deleted successfully' });
    } catch (err) {
        if (err.message === 'User not found')
            return res.status(404).json({ error: err.message });
        if (err.message === 'Cannot delete another admin user')
            return res.status(403).json({ error: err.message });
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
}

async function banUser(req, res) {
    const { id } = req.params;
    try {
        await banUserById(id);
        res.status(200).json({ message: 'User account has been banned' });
    } catch (err) {
        if (err.message === 'User not found')
            return res.status(404).json({ error: err.message });
        if (err.message === 'Cannot ban an admin user')
            return res.status(403).json({ error: err.message });
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
}

async function unbanUser(req, res) {
    const { id } = req.params;
    try {
        await unbanUserById(id);
        res.status(200).json({ message: 'User has been unbanned successfully' });
    } catch (err) {
        if (err.message === 'User not found')
            return res.status(404).json({ error: err.message });
        if (err.message === 'User is not banned')
            return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
}

async function createUserByAdmin(req, res) {
    try {
        const userData = req.body;
        const newUser = await createUser(userData);
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        res.status(400).json({ error: err.message });
    }
}

async function changeUserPassword(req, res) {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim() === '')
        return res.status(400).json({ error: 'New password is required and cannot be empty' });
    try {
        await changeUserPasswordById(id, newPassword);
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        if (err.message === 'User not found')
            return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'An unexpected error occurred while updating the password.' });
    }
}

async function setUserRole(req, res) {
    const { id } = req.params;
    const { role } = req.body;
    if (!role)
        return res.status(400).json({ error: 'Role is a required field' });
    try {
        await setUserRoleById(id, role);
        res.status(200).json({ message: `User role changed to ${role}` });
    } catch (err) {
        if (err.message === 'User not found')
            return res.status(404).json({ error: err.message });
        res.status(400).json({ error: 'Failed to update user role. The provided role may be invalid.' });
    }
}

async function getUsers(req, res) {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve users.' });
    }
}

module.exports = {
    deleteUser,
    banUser,
    unbanUser,
    createUserByAdmin,
    changeUserPassword,
    setUserRole,
    getUsers,
};
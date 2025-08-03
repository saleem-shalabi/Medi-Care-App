const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    const user = await prisma.Users.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role === "ADMIN") {
      return res
        .status(403)
        .json({ error: "Cannot delete another admin user" });
    }
    await prisma.Users.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "User account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function banUser(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.Users.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({ error: "Cannot ban an admin user" });
    }

    await prisma.Users.update({
      where: { id: Number(id) },
      data: { isBanned: true },
    });

    res.json({ message: "User account has been banned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function unbanUser(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.Users.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isBanned === false) {
      return res.status(400).json({ error: "User is not banned" });
    }

    await prisma.Users.update({
      where: { id: Number(id) },
      data: { isBanned: false },
    });

    res.json({ message: "User has been unbanned successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createUserByAdmin(req, res) {
  const { username, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.Users.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role || "USER", // default to USER if not provided
      },
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function changeUserPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }

  try {
    const user = await prisma.Users.findUnique({ where: { id: Number(id) } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.Users.update({
      where: { id: Number(id) },
      data: { password: hashed },
    });

    res.json({ message: "Password updated successfully for user" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getUsers(req, res) {
  try {
    const users = await prisma.Users.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true,
        createdAt: true,
        number: true,
        image: true,
        jobTitle: true,
        bio: true,
      },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
module.exports = {
  deleteUser,
  banUser,
  unbanUser,
  createUserByAdmin,
  changeUserPassword,
  getUsers,
};

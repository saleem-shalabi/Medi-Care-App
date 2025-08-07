const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const requireRole = require("../middlewares/requireRole");
const {
  deleteUser,
  banUser,
  unbanUser,
  createUserByAdmin,
  changeUserPassword,
  getUsers,
} = require("../controllers/adminController");

router.put("/set-role/:id", requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // Must be one of: ADMIN, USER, ACCOUNTANT, MAINTENANCE
  try {
    const updated = await prisma.Users.update({
      where: { id: Number(id) },
      data: { role },
    });
    res.json({ message: `User role changed to ${role}`, user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/delete-user/:id", requireRole("ADMIN"), deleteUser);
router.put("/ban-user/:id", requireRole("ADMIN"), banUser);
router.put("/unban-user/:id", requireRole("ADMIN"), unbanUser);
router.post("/create-user", requireRole("ADMIN"), createUserByAdmin);
router.put("/change-password/:id", requireRole("ADMIN"), changeUserPassword);
router.get("/get-users", requireRole("ADMIN"), getUsers);

module.exports = router;

const router = require("express").Router();
const User = require("../models/User");

// Récupérer tous les utilisateurs en ligne (simulation)
router.get("/online", async (req, res) => {
  try {
    const users = await User.find().select("username avatar _id friends");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

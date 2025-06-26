const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

function auth(req, res, next) {
  const h = req.header("Authorization");
  if (!h) return res.status(401).send("Token manquant");
  try {
    req.userId = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).send("Token invalide");
  }
}

// Online (tous vérifiés)
router.get("/online", auth, async (req, res) => {
  const list = await User.find({ verified: true }).select("username avatar _id");
  res.json(list);
});

// Liste d'amis
router.get("/friends", auth, async (req, res) => {
  const u = await User.findById(req.userId).populate("friends","username avatar _id");
  res.json(u.friends);
});

// Ajouter ami
router.post("/friends/add", auth, async (req, res) => {
  const { targetId } = req.body;
  await User.findByIdAndUpdate(req.userId,   { $addToSet: { friends: targetId } });
  await User.findByIdAndUpdate(targetId,     { $addToSet: { friends: req.userId } });
  res.json({ message: "Demande envoyée / Ami ajouté." });
});

module.exports = router;

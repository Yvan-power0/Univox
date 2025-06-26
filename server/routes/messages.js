const router  = require("express").Router();
const jwt     = require("jsonwebtoken");
const Message = require("../models/Message");

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

// Chat public
router.post("/public", auth, async (req, res) => {
  const m = await Message.create({
    sender: req.userId,
    receiver: null,
    content: req.body.content
  });
  res.json(m);
});

// Historique privé
router.get("/private/:withId", auth, async (req, res) => {
  const { withId } = req.params;
  const msgs = await Message.find({
    $or: [
      { sender: req.userId,   receiver: withId },
      { sender: withId,       receiver: req.userId }
    ]
  }).sort("createdAt");
  res.json(msgs);
});

// Envoi privé
router.post("/private/:withId", auth, async (req, res) => {
  const m = await Message.create({
    sender:   req.userId,
    receiver: req.params.withId,
    content:  req.body.content
  });
  res.json(m);
});

module.exports = router;

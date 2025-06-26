const router     = require("express").Router();
const multer     = require("multer");
const bcrypt     = require("bcrypt");
const jwt        = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto     = require("crypto");
const User       = require("../models/User");
const Token      = require("../models/Token");

// Multer pour avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/images/"),
  filename:    (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

// Inscription
router.post("/register", upload.single("avatar"), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ error: "Email déjà utilisé." });

    const hash = await bcrypt.hash(password, 10);
    const avatarUrl = req.file ? `/images/${req.file.filename}` : "";
    const user = await User.create({ username, email, password: hash, avatar: avatarUrl });

    // Token de vérif.
    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({ userId: user._id, token });

    const url = `${process.env.APP_URL}/api/auth/verify/${token}`;
    await transporter.sendMail({
      to: user.email,
      subject: "Vérifiez votre compte Univox",
      html: `Cliquez <a href="${url}">ici</a> pour vérifier votre email.`
    });

    res.json({ message: "Inscription réussie ! Vérifiez votre email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vérification email
router.get("/verify/:token", async (req, res) => {
  try {
    const tokenDoc = await Token.findOne({ token: req.params.token });
    if (!tokenDoc) return res.status(400).send("Token invalide ou expiré.");

    await User.findByIdAndUpdate(tokenDoc.userId, { verified: true });
    await Token.deleteOne({ _id: tokenDoc._id });
    res.send("Email vérifié ! Vous pouvez vous connecter.");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Connexion
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)        return res.status(400).json({ error: "Email inconnu." });
    if (!user.verified) return res.status(400).json({ error: "Compte non vérifié." });
    if (!await bcrypt.compare(password, user.password))
                      return res.status(400).json({ error: "Mot de passe incorrect." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      user: { _id: user._id, username: user.username, avatar: user.avatar },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

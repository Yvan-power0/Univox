const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

// Transporteur pour envoyer les e-mails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Inscription
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email déjà utilisé" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed });

    // Générer un token pour l'e-mail de vérification
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Envoi du mail
    const link = `https://ton-domaine.com/verify-email/${token}`; // à remplacer plus tard

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Univox - Vérifie ton adresse",
      html: `<h3>Bienvenue sur Univox 🎉</h3>
             <p>Merci de créer un compte. Clique ci-dessous pour activer ton profil :</p>
             <a href="${link}">Activer mon compte</a>`
    });

    await user.save();
    res.status(201).json({ message: "Utilisateur enregistré. Vérifie ton e-mail." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vérification du compte
router.get("/verify-email/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).send("Utilisateur introuvable");

    user.verified = true;
    await user.save();

    res.send("✅ Ton compte Univox est maintenant vérifié !");
  } catch (err) {
    res.status(400).send("Lien invalide ou expiré");
  }
});

// Connexion
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Compte introuvable" });
    if (!user.verified) return res.status(403).json({ message: "Compte non vérifié" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    res.status(200).json({ message: "Connexion réussie", user: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

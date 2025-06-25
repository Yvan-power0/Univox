const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoute = require("./routes/auth");
const usersRoute = require("./routes/users");
// const friendsRoute = require("./routes/friends"); // ← à activer quand prêt
// const messagesRoute = require("./routes/messages"); // ← idem

const app = express();
dotenv.config();

// Connexion à MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connexion MongoDB réussie"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoute);
app.use("/users", usersRoute);
// app.use("/friends", friendsRoute); // ← à activer plus tard
// app.use("/messages", messagesRoute); // ← idem

module.exports = app;

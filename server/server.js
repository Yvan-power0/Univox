const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");
const { Server } = require("socket.io");
const http = require("http");

dotenv.config();
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error(err));

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Socket.IO pour messagerie en temps réel
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("🟢 Nouvel utilisateur connecté");

  socket.on("new-user", (username) => {
    onlineUsers.push({ id: socket.id, name: username });
    io.emit("online-users", onlineUsers);
  });

  socket.on("send-message", (data) => {
    io.emit("receive-message", data);
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.id !== socket.id);
    io.emit("online-users", onlineUsers);
    console.log("🔴 Utilisateur déconnecté");
  });
});

// Lancement du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
});

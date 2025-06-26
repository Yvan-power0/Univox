const express   = require("express");
const cors      = require("cors");
const mongoose  = require("mongoose");
const dotenv    = require("dotenv");
const http      = require("http");
const { Server }= require("socket.io");

dotenv.config();
const app    = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/images", express.static("public/images"));

// Connexion MongoDB
mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// Routes REST
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/users",    require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));

// Socket.IO
const io = new Server(server, { cors: { origin: "*" } });
let online = {};

io.on("connection", socket => {
  socket.on("new-user", userId => {
    online[userId] = socket.id;
    io.emit("online-users", Object.keys(online));
  });

  socket.on("send-message", ({ to, content }) => {
    const from = Object.keys(online).find(id => online[id] === socket.id);
    const targetSock = online[to];
    if (targetSock) {
      io.to(targetSock).emit("receive-message", { from, content });
    }
  });

  socket.on("disconnect", () => {
    const entry = Object.entries(online).find(([, sid]) => sid === socket.id);
    if (entry) {
      delete online[entry[0]];
      io.emit("online-users", Object.keys(online));
    }
  });
});

// Lancement
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur ${PORT}`));

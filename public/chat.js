const params     = new URLSearchParams(location.search);
const friendId   = params.get("friend");
const friendName = params.get("name");
document.getElementById("friendName").textContent = friendName;

const token = localStorage.getItem("token");
if (!token) return window.location = "index.html";
const hdr = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

const me = JSON.parse(atob(token.split(".")[1])).id;

// Socket.IO
const socket = io({ auth: { token } });
socket.emit("new-user", me);

const msgsEl = document.getElementById("messagesList");
const inEl    = document.getElementById("messageInput");
const btn     = document.getElementById("sendBtn");

// load historique
fetch(`/api/messages/private/${friendId}`, { headers: hdr })
  .then(r => r.json())
  .then(msgs => {
    msgs.forEach(m => {
      const d = document.createElement("div");
      d.className = m.sender === me ? "from-me" : "from-them";
      d.textContent = m.content;
      msgsEl.appendChild(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  });

// envoyer
btn.onclick = () => {
  const c = inEl.value.trim();
  if (!c) return;
  // REST
  fetch(`/api/messages/private/${friendId}`, {
    method:"POST",
    headers: hdr,
    body: JSON.stringify({ content: c })
  }).then(() => {
    const d = document.createElement("div");
    d.className = "from-me";
    d.textContent = c;
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  });

  // socket
  socket.emit("send-message", { to: friendId, content: c });
  inEl.value = "";
};

// recevoir en temps réel
socket.on("receive-message", ({ from, content }) => {
  if (from !== friendId) return;
  const d = document.createElement("div");
  d.className = "from-them";
  d.textContent = content;
  msgsEl.appendChild(d);
  msgsEl.scrollTop = msgsEl.scrollHeight;
});

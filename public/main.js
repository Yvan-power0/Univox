const token = localStorage.getItem("token");
if (!token) return window.location = "index.html";

const hdr = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
};

let me;

// decode ID from JWT
me = JSON.parse(atob(token.split(".")[1])).id;

// Socket.IO
const socket = io({ auth: { token } });
socket.emit("new-user", me);

// affiche online
socket.on("online-users", list => {
  const ou = document.getElementById("onlineUsers");
  ou.innerHTML = "";
  list.forEach(uid => {
    if (uid === me) return;
    const d = document.createElement("div");
    d.className = "avatar-wrapper";
    d.innerHTML = `
      <img src="default.jpg"/>
      <span class="online-dot"></span>
      <button class="add-friend" onclick="addFriend('${uid}')">+</button>
    `;
    ou.appendChild(d);
  });
});

// charge amis
loadFriends();
async function loadFriends() {
  const fl = await fetch("/api/users/friends", { headers: hdr }).then(r => r.json());
  const list = document.getElementById("friendsList");
  list.innerHTML = "";
  fl.forEach(f => {
    const c = document.createElement("div");
    c.className = "friend-card";
    c.innerHTML = `
      <img src="${f.avatar||'default.jpg'}"/>
      <div class="friend-info">
        <div class="friend-name">${f.username}</div>
      </div>
      <div class="unread-count" id="count-${f._id}">0</div>
    `;
    c.onclick = () => location.href = `conversation.html?friend=${f._id}&name=${encodeURIComponent(f.username)}`;
    list.appendChild(c);

    // compteur non lus
    fetch(`/api/messages/private/${f._id}`, { headers: hdr })
      .then(r => r.json())
      .then(msgs => {
        const unread = msgs.filter(m => m.receiver === me && !m.seen).length;
        document.getElementById(`count-${f._id}`).textContent = unread;
      });
  });
}

// ajout d'ami
function addFriend(targetId) {
  fetch("/api/users/friends/add", {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ targetId })
  }).then(() => loadFriends());
}

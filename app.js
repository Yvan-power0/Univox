// Simulation de tchat en local (à remplacer plus tard par une vraie API + WebSocket)
let pseudo = "";
let usersOnline = [];
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const chatInterface = document.getElementById("chatInterface");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendMessage = document.getElementById("sendMessage");
const onlineUsers = document.getElementById("usersOnline");

// Affiche l’image choisie dans le formulaire (preview)
const avatarInput = document.getElementById("regAvatar");
if (avatarInput) {
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const preview = document.createElement("img");
      preview.src = url;
      preview.alt = "Avatar";
      preview.style.width = "80px";
      preview.style.borderRadius = "50%";
      avatarInput.parentNode.insertBefore(preview, avatarInput.nextSibling);
    }
  });
}

// Inscription (mock local)
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  pseudo = document.getElementById("regUsername").value;
  alert("Compte créé (simulation)\nBienvenue " + pseudo);
  registerForm.style.display = "none";
  loginForm.style.display = "none";
  chatInterface.style.display = "block";
  addUser(pseudo);
});

// Connexion (mock local)
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  pseudo = document.getElementById("loginEmail").value.split("@")[0];
  alert("Connexion réussie (simulation)\nBonjour " + pseudo);
  registerForm.style.display = "none";
  loginForm.style.display = "none";
  chatInterface.style.display = "block";
  addUser(pseudo);
});

// Envoyer un message
sendMessage.addEventListener("click", () => {
  const msg = messageInput.value.trim();
  if (msg !== "") {
    const div = document.createElement("div");
    div.textContent = `${pseudo} : ${msg}`;
    chatBox.appendChild(div);
    messageInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// Simuler un utilisateur en ligne
function addUser(name) {
  if (!usersOnline.includes(name)) {
    usersOnline.push(name);
    onlineUsers.textContent = "Utilisateurs en ligne : " + usersOnline.length;
  }
}

const R = id => document.getElementById(id);

const regForm = R("registerForm"), logForm = R("loginForm");
R("showLogin").onclick = e => {
  e.preventDefault();
  regForm.classList.add("hidden");
  logForm.classList.remove("hidden");
};
R("showRegister").onclick = e => {
  e.preventDefault();
  logForm.classList.add("hidden");
  regForm.classList.remove("hidden");
};

// Preview avatar
R("regAvatar").onchange = e => {
  const prev = R("avatarPreview");
  prev.innerHTML = "";
  const f = e.target.files[0];
  if (f) {
    const img = new Image();
    img.src = URL.createObjectURL(f);
    prev.appendChild(img);
  }
};

// Submit register
regForm.onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData(regForm);
  const res = await fetch("/api/auth/register", { method: "POST", body: fd });
  const j   = await res.json();
  alert(j.error || j.message);
  if (res.ok) {
    regForm.reset();
    R("avatarPreview").innerHTML = "";
  }
};

// Submit login
logForm.onsubmit = async e => {
  e.preventDefault();
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:    R("loginEmail").value,
      password: R("loginPassword").value
    })
  });
  const j = await res.json();
  if (!res.ok) return alert(j.error);
  localStorage.setItem("token", j.token);
  window.location = "chat.html";
};

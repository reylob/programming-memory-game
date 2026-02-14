const API_BASE = ""; // same origin

const els = {
  // auth + shell
  authCard: document.getElementById("authCard"),
  gameCard: document.getElementById("gameCard"),
  scoresCard: document.getElementById("scoresCard"),
  leaderboardCard: document.getElementById("leaderboardCard"),

  userLabel: document.getElementById("userLabel"),
  logoutBtn: document.getElementById("logoutBtn"),
  authErr: document.getElementById("authErr"),

  tabs: [...document.querySelectorAll(".tab")],
  loginPane: document.getElementById("loginPane"),
  registerPane: document.getElementById("registerPane"),

  loginId: document.getElementById("loginId"),
  loginPw: document.getElementById("loginPw"),
  loginBtn: document.getElementById("loginBtn"),

  regSchoolId: document.getElementById("regSchoolId"),
  regName: document.getElementById("regName"),
  regEmail: document.getElementById("regEmail"),
  regPw: document.getElementById("regPw"),
  registerBtn: document.getElementById("registerBtn"),

  // nav
  viewScoresBtn: document.getElementById("viewScoresBtn"),
  backToGame: document.getElementById("backToGame"),
  scoresList: document.getElementById("scoresList"),

  viewLeaderboardBtn: document.getElementById("viewLeaderboardBtn"),
  backFromLeaderboard: document.getElementById("backFromLeaderboard"),
  refreshLeaderboard: document.getElementById("refreshLeaderboard"),
  lbDifficulty: document.getElementById("lbDifficulty"),
  lbScope: document.getElementById("lbScope"),
  leaderboardList: document.getElementById("leaderboardList"),
  myRankLine: document.getElementById("myRankLine"),

  // mode
  modeMemory: document.getElementById("modeMemory"),
  modeQuiz: document.getElementById("modeQuiz"),
  memoryControls: document.getElementById("memoryControls"),

  // memory ui
  difficulty: document.getElementById("difficulty"),
  startBtn: document.getElementById("startBtn"),
  board: document.getElementById("board"),
  time: document.getElementById("time"),
  moves: document.getElementById("moves"),
  matches: document.getElementById("matches"),
  saveMsg: document.getElementById("saveMsg"),

  // quiz ui
  quizPanel: document.getElementById("quizPanel"),
  quizStartBtn: document.getElementById("quizStartBtn"),
  quizNextBtn: document.getElementById("quizNextBtn"),
  quizTime: document.getElementById("quizTime"),
  quizQn: document.getElementById("quizQn"),
  quizScore: document.getElementById("quizScore"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizChoices: document.getElementById("quizChoices"),
  quizMsg: document.getElementById("quizMsg"),
};

function setView(view) {
  els.authCard.classList.toggle("hidden", view !== "auth");
  els.gameCard.classList.toggle("hidden", view !== "game");
  els.scoresCard.classList.toggle("hidden", view !== "scores");
  els.leaderboardCard.classList.toggle("hidden", view !== "leaderboard");
}

function setAuthState(user) {
  if (!user) {
    els.userLabel.textContent = "Not logged in";
    els.logoutBtn.hidden = true;
    setView("auth");
    return;
  }
  els.userLabel.textContent = `Logged in: ${user.name}`;
  els.logoutBtn.hidden = false;
  setView("game");
}

function getToken() {
  return localStorage.getItem("token");
}
function getUser() {
  const s = localStorage.getItem("user");
  return s ? JSON.parse(s) : null;
}
function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  setAuthState(user);
}
function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  setAuthState(null);
}

async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// small helper to prevent HTML injection in names
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Tabs
els.tabs.forEach((t) => {
  t.addEventListener("click", () => {
    els.tabs.forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const tab = t.dataset.tab;
    els.loginPane.classList.toggle("hidden", tab !== "login");
    els.registerPane.classList.toggle("hidden", tab !== "register");
    els.authErr.textContent = "";
  });
});

// Auth
els.loginBtn.addEventListener("click", async () => {
  els.authErr.textContent = "";
  try {
    const out = await api("/api/auth/login", {
      method: "POST",
      body: { emailOrSchoolId: els.loginId.value.trim(), password: els.loginPw.value },
    });
    saveSession(out.token, out.user);
  } catch (e) {
    els.authErr.textContent = e.message;
  }
});

els.registerBtn.addEventListener("click", async () => {
  els.authErr.textContent = "";
  try {
    const out = await api("/api/auth/register", {
      method: "POST",
      body: {
        school_id: els.regSchoolId.value.trim() || null,
        name: els.regName.value.trim(),
        email: els.regEmail.value.trim() || null,
        password: els.regPw.value,
      },
    });
    saveSession(out.token, out.user);
  } catch (e) {
    els.authErr.textContent = e.message;
  }
});

els.logoutBtn.addEventListener("click", clearSession);

// Mode switching
let currentMode = "memory";
function setMode(mode) {
  currentMode = mode;

  els.modeMemory.classList.toggle("active", mode === "memory");
  els.modeQuiz.classList.toggle("active", mode === "quiz");

  const memoryPanel = document.getElementById("memoryPanel");
  if (memoryPanel) memoryPanel.classList.toggle("hidden", mode !== "memory");

  els.memoryControls.classList.toggle("hidden", mode !== "memory");
  els.quizPanel.classList.toggle("hidden", mode !== "quiz");

  // Stop background timers safely (functions exist after other scripts load)
  if (mode !== "memory" && typeof stopTimer === "function") stopTimer();
  if (mode !== "quiz" && typeof stopQuizTimer === "function") stopQuizTimer();

  if (mode === "memory") els.quizMsg.textContent = "";
  if (mode === "quiz") els.saveMsg.textContent = "";
}

els.modeMemory.addEventListener("click", () => setMode("memory"));
els.modeQuiz.addEventListener("click", () => setMode("quiz"));

// Leaderboard
async function loadLeaderboard() {
  const difficulty = els.lbDifficulty.value;
  const scope = els.lbScope.value;

  els.leaderboardList.innerHTML = `<div class="item">Loading...</div>`;
  els.myRankLine.textContent = "";

  try {
    const [top, me] = await Promise.all([
      api(`/api/leaderboard?difficulty=${encodeURIComponent(difficulty)}&scope=${encodeURIComponent(scope)}`),
      api(`/api/leaderboard/me?difficulty=${encodeURIComponent(difficulty)}&scope=${encodeURIComponent(scope)}`),
    ]);

    const rows = top.rows || [];

    if (me?.hasScore) {
      els.myRankLine.textContent =
        `Your best: ${me.best.score} pts • ${me.best.seconds}s • ${me.best.moves} moves — Rank #${me.rank} / ${me.totalPlayers}`;
    } else {
      els.myRankLine.textContent = "You don’t have a score for this difficulty yet.";
    }

    if (!rows.length) {
      els.leaderboardList.innerHTML = `<div class="item">No scores yet for ${difficulty.toUpperCase()}.</div>`;
      return;
    }

    els.leaderboardList.innerHTML = rows.map((r, idx) => `
      <div class="item">
        <div><b>#${idx + 1}</b> — <b>${escapeHtml(r.player)}</b> — Score: <b>${r.score}</b></div>
        <div class="small">Moves: ${r.moves} • Time: ${r.seconds}s • ${r.created_at}</div>
      </div>
    `).join("");
  } catch (e) {
    els.leaderboardList.innerHTML = `<div class="item">Failed: ${escapeHtml(e.message)}</div>`;
  }
}

els.viewLeaderboardBtn.addEventListener("click", async () => {
  setView("leaderboard");
  els.lbDifficulty.value = els.difficulty.value;
  els.lbScope.value = els.lbScope.value || "all";
  await loadLeaderboard();
});
els.backFromLeaderboard.addEventListener("click", () => setView("game"));
els.refreshLeaderboard.addEventListener("click", loadLeaderboard);
els.lbDifficulty.addEventListener("change", loadLeaderboard);
els.lbScope.addEventListener("change", loadLeaderboard);

// Scores UI
els.viewScoresBtn.addEventListener("click", async () => {
  setView("scores");
  els.scoresList.innerHTML = "Loading...";

  try {
    const [mem, quiz] = await Promise.all([
      api("/api/scores/me"),
      api("/api/quiz/scores/me"),
    ]);

    const memRows = mem.rows || [];
    const quizRows = quiz.rows || [];

    const memHtml = memRows.length ? memRows.map(r => `
      <div class="item">
        <div><b>MEMORY</b> — <b>${r.difficulty.toUpperCase()}</b> — Score: <b>${r.score}</b></div>
        <div class="small">Moves: ${r.moves} • Time: ${r.seconds}s • ${r.created_at}</div>
      </div>
    `).join("") : `<div class="item">No Memory scores yet.</div>`;

    const quizHtml = quizRows.length ? quizRows.map(r => `
      <div class="item">
        <div><b>QUIZ</b> — Points: <b>${r.score}</b> • Out of: <b>${r.total}</b></div>
        <div class="small">Time: ${r.seconds}s • ${r.created_at}</div>
      </div>
    `).join("") : `<div class="item">No Quiz scores yet.</div>`;

    els.scoresList.innerHTML = `
      <div class="item"><b>Memory Scores</b></div>
      ${memHtml}
      <div class="item"><b>Quiz Scores</b></div>
      ${quizHtml}
    `;
  } catch (e) {
    els.scoresList.innerHTML = `<div class="item">Failed: ${escapeHtml(e.message)}</div>`;
  }
});
els.backToGame.addEventListener("click", () => setView("game"));

// Boot (safe even before other scripts define timers)
setAuthState(getUser());
setMode("memory");

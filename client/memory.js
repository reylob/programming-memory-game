// ===== Memory Game =====
const TERMS = [
  "Python", "Java", "C++", "JavaScript", "PHP", "SQL",
  "HTML", "CSS", "React", "Node", "Variable", "Function",
  "Loop", "Array", "Object", "Class", "API", "Git",
];

let state = {
  gridCols: 4,
  pairs: 6,
  running: false,
  first: null,
  second: null,
  lock: false,
  moves: 0,
  matches: 0,
  seconds: 0,
  timer: null,
  deck: [],
};

function pickPairs(n) {
  const copy = [...TERMS];
  copy.sort(() => Math.random() - 0.5);
  return copy.slice(0, n);
}

function buildDeck(pairs) {
  const chosen = pickPairs(pairs);
  const deck = [...chosen, ...chosen].map((label, idx) => ({
    id: `${label}-${idx}-${Math.random().toString(16).slice(2)}`,
    label,
    revealed: false,
    matched: false,
  }));
  deck.sort(() => Math.random() - 0.5);
  return deck;
}

function setDifficulty(diff) {
  if (diff === "easy") return { cols: 4, pairs: 6 };
  if (diff === "medium") return { cols: 4, pairs: 8 };
  return { cols: 6, pairs: 12 };
}

function renderMemory() {
  els.board.style.gridTemplateColumns = `repeat(${state.gridCols}, 1fr)`;
  els.board.innerHTML = "";

  for (const card of state.deck) {
    const btn = document.createElement("div");
    btn.className = "cardbtn";
    if (card.revealed) btn.classList.add("revealed");
    if (card.matched) btn.classList.add("matched");
    btn.textContent = card.revealed || card.matched ? card.label : "❓";
    btn.addEventListener("click", () => onPick(card.id));
    els.board.appendChild(btn);
  }

  els.moves.textContent = String(state.moves);
  els.matches.textContent = String(state.matches);
  els.time.textContent = String(state.seconds);
}

function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.seconds += 1;
    els.time.textContent = String(state.seconds);
  }, 1000);
}

// exposed to app.js via global function name
function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

function resetGame(diff) {
  const d = setDifficulty(diff);

  state.gridCols = d.cols;
  state.pairs = d.pairs;
  state.running = true;
  state.first = null;
  state.second = null;
  state.lock = false;
  state.moves = 0;
  state.matches = 0;
  state.seconds = 0;
  state.deck = buildDeck(state.pairs);

  els.saveMsg.textContent = "";
  els.startBtn.textContent = "Restart";
  els.startBtn.classList.add("running");

  startTimer();
  renderMemory();
}

function resetToIdleBoard() {
  state.running = false;
  state.lock = false;
  state.first = null;
  state.second = null;

  state.moves = 0;
  state.matches = 0;
  state.seconds = 0;

  for (const c of state.deck) {
    c.revealed = false;
    c.matched = false;
  }

  stopTimer();
  els.startBtn.textContent = "Start";
  els.startBtn.classList.remove("running");
  els.time.textContent = "0";
  els.moves.textContent = "0";
  els.matches.textContent = "0";

  renderMemory();
}

function scoreCalc() {
  const base = state.pairs * 100;
  const movePenalty = state.moves * 5;
  const timePenalty = state.seconds * 2;
  return Math.max(0, base - movePenalty - timePenalty);
}

async function saveScore() {
  const difficulty = els.difficulty.value;
  const score = scoreCalc();
  await api("/api/scores", {
    method: "POST",
    body: { difficulty, score, moves: state.moves, seconds: state.seconds },
  });
  return score;
}

function confettiBurst(count = 55) {
  const wrap = document.createElement("div");
  wrap.className = "confetti";

  const colors = ["#7C5CFF", "#38BDF8", "#9DFFB5", "#FFD166", "#FF6B6B"];

  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    p.style.left = `${Math.random() * 100}vw`;
    p.style.animationDelay = `${Math.random() * 150}ms`;
    const size = 6 + Math.random() * 10;
    p.style.width = `${size}px`;
    p.style.height = `${size * 1.4}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    wrap.appendChild(p);
  }

  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1100);
}

function onPick(id) {
  if (!state.running || state.lock) return;

  const card = state.deck.find((c) => c.id === id);
  if (!card || card.matched || card.revealed) return;

  card.revealed = true;

  if (!state.first) {
    state.first = card;
    renderMemory();
    return;
  }

  state.second = card;
  state.moves += 1;
  state.lock = true;
  renderMemory();

  const match = state.first.label === state.second.label;

  setTimeout(async () => {
    if (match) {
      state.first.matched = true;
      state.second.matched = true;
      state.matches += 1;
    } else {
      state.first.revealed = false;
      state.second.revealed = false;
    }

    state.first = null;
    state.second = null;
    state.lock = false;
    renderMemory();

    if (state.matches === state.pairs) {
      state.running = false;
      stopTimer();

      els.saveMsg.textContent = "🎉 You won! Saving...";
      confettiBurst(55);

      try {
        const score = await saveScore();
        els.saveMsg.textContent = `🎉 You won! Score: ${score} — Saved!`;
      } catch (e) {
        els.saveMsg.textContent = `🎉 You won! Save failed: ${e.message}`;
      } finally {
        setTimeout(() => {
          els.saveMsg.textContent = "";
          resetToIdleBoard();
        }, 900);
      }
    }
  }, 650);
}

els.startBtn.addEventListener("click", () => {
  if (state.running) stopTimer();
  resetGame(els.difficulty.value);
});

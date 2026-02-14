// ===== Quiz Game (Upgraded) =====
const QUIZ = [
  { q: "Which keyword declares a constant in JavaScript?", choices: ["let", "var", "const", "static"], a: 2 },
  { q: "Which SQL clause filters rows?", choices: ["WHERE", "ORDER BY", "GROUP BY", "JOIN"], a: 0 },
  { q: "In Python, which creates a function?", choices: ["func", "def", "lambda", "function"], a: 1 },
  { q: "What does HTML stand for?", choices: ["HyperText Markup Language", "HighText Machine Language", "Hyperlinks Text Mark Language", "Home Tool Markup Language"], a: 0 },
  { q: "Which is a valid CSS selector for a class?", choices: ["#box", ".box", "@box", "*box"], a: 1 },
  { q: "Which data structure is key-value in JS?", choices: ["Array", "Object", "Tuple", "Set"], a: 1 },
  { q: "Git command to upload commits?", choices: ["git push", "git pull", "git add", "git fork"], a: 0 },
  { q: "Which loop runs at least once?", choices: ["for", "while", "do...while", "foreach"], a: 2 },
  { q: "HTTP status for 'Not Found'?", choices: ["200", "301", "404", "500"], a: 2 },
  { q: "Which is NOT a programming language?", choices: ["Python", "CSS", "Java", "C#"], a: 1 },
];

let quizState = {
  running: false,
  idx: 0,
  correct: 0,
  points: 0,
  total: 10,
  seconds: 0,
  timer: null,
  questions: [],
  locked: false,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeQuestion(q) {
  const choiceObjs = q.choices.map((text, i) => ({ text, isCorrect: i === q.a }));
  const shuffled = shuffle(choiceObjs);
  return {
    q: q.q,
    choices: shuffled.map(x => x.text),
    correctIndex: shuffled.findIndex(x => x.isCorrect),
  };
}

function pickQuiz(n) {
  return shuffle(QUIZ).slice(0, Math.min(n, QUIZ.length)).map(normalizeQuestion);
}

function startQuizTimer() {
  clearInterval(quizState.timer);
  quizState.timer = setInterval(() => {
    quizState.seconds += 1;
    els.quizTime.textContent = String(quizState.seconds);
  }, 1000);
}

// exposed to app.js via global function name
function stopQuizTimer() {
  clearInterval(quizState.timer);
  quizState.timer = null;
}

function renderQuiz() {
  const current = quizState.questions[quizState.idx];

  els.quizQn.textContent = String(quizState.idx + 1);
  els.quizScore.textContent = String(quizState.points);
  els.quizQuestion.textContent = current.q;
  els.quizMsg.textContent = "";

  els.quizChoices.innerHTML = current.choices.map((c, i) => `
    <button class="ghost choiceBtn" type="button" data-i="${i}">
      ${escapeHtml(c)}
    </button>
  `).join("");

  const btns = [...els.quizChoices.querySelectorAll("button.choiceBtn")];
  btns.forEach(btn => btn.addEventListener("click", () => onAnswer(Number(btn.dataset.i))));

  const isLast = quizState.idx === quizState.total - 1;
  els.quizNextBtn.textContent = isLast ? "Finish" : "Next";
  els.quizNextBtn.disabled = true;
  els.quizNextBtn.onclick = nextQuestion;

  quizState.locked = false;
}

function markChoices(pickedIndex, correctIndex) {
  const btns = [...els.quizChoices.querySelectorAll("button.choiceBtn")];
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIndex) b.classList.add("correct");
    if (i === pickedIndex && pickedIndex !== correctIndex) b.classList.add("wrong");
  });

  els.quizNextBtn.disabled = false;
}

function onAnswer(choiceIdx) {
  if (!quizState.running || quizState.locked) return;
  quizState.locked = true;

  const current = quizState.questions[quizState.idx];
  const correctIdx = current.correctIndex;
  const isCorrect = choiceIdx === correctIdx;

  if (isCorrect) {
    quizState.correct += 1;
    const speedBonus = Math.max(0, 50 - Math.floor(quizState.seconds / 3));
    const gained = 100 + speedBonus;
    quizState.points += gained;
    els.quizMsg.textContent = `✅ Correct! +${gained} pts`;
  } else {
    els.quizMsg.textContent = "❌ Wrong. Correct answer highlighted.";
  }

  els.quizScore.textContent = String(quizState.points);
  markChoices(choiceIdx, correctIdx);
}

function nextQuestion() {
  if (!quizState.running) return;

  quizState.idx += 1;
  if (quizState.idx >= quizState.total) {
    finishQuiz();
  } else {
    renderQuiz();
  }
}

async function finishQuiz() {
  quizState.running = false;
  stopQuizTimer();

  const summary = `Finished! ${quizState.correct}/${quizState.total} • ${quizState.points} pts • ${quizState.seconds}s`;
  els.quizMsg.textContent = summary;

  try {
    await api("/api/quiz/scores", {
      method: "POST",
      body: { score: quizState.points, total: quizState.total, seconds: quizState.seconds },
    });
    els.quizMsg.textContent = summary + " — Saved!";
  } catch (e) {
    els.quizMsg.textContent = summary + ` — Save failed: ${e.message}`;
  } finally {
    // reset Next button to disabled after finish
    els.quizNextBtn.disabled = true;
  }
}

function resetQuiz() {
  quizState.running = true;
  quizState.idx = 0;
  quizState.correct = 0;
  quizState.points = 0;
  quizState.seconds = 0;
  quizState.total = 10;
  quizState.questions = pickQuiz(quizState.total);
  quizState.locked = false;

  els.quizTime.textContent = "0";
  els.quizQn.textContent = "1";
  els.quizScore.textContent = "0";
  els.quizMsg.textContent = "";

  startQuizTimer();
  renderQuiz();
}

els.quizStartBtn.addEventListener("click", () => {
  setMode("quiz");
  resetQuiz();
});

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const stokeEl = document.getElementById("stoke");
const waveEl = document.getElementById("wave");
const timeEl = document.getElementById("time");
const restartButton = document.getElementById("restart");

const keys = new Set();
let state;
let last = performance.now();
let lastTrick = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);

function reset() {
  state = {
    surfer: { x: 260, y: 330, vy: 0, speed: 1, spray: [] },
    score: 0,
    stoke: 100,
    wave: 1,
    time: 90,
    obstacles: [],
    foam: [],
    obstacleTimer: 0.9,
    ended: false,
    message: "Stay in the pocket and stack clean turns.",
    trickFlash: 0,
  };
  updateHud();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function updateHud() {
  scoreEl.textContent = Math.round(state.score);
  stokeEl.textContent = Math.round(Math.max(0, state.stoke));
  waveEl.textContent = state.wave;
  timeEl.textContent = Math.ceil(Math.max(0, state.time));
}

function pocketY(x, h) {
  return h * 0.5 + Math.sin(x * 0.012 + performance.now() * 0.002) * 54;
}

function spawnObstacle(w, h) {
  state.obstacles.push({
    x: w + 80,
    y: rand(h * 0.25, h * 0.78),
    r: rand(18, 34),
    kind: Math.random() > 0.52 ? "driftwood" : "closeout",
    speed: rand(210, 300),
  });
}

function trick() {
  if (state.ended) return;
  const now = performance.now();
  if (now - lastTrick < 700) return;
  lastTrick = now;
  const rect = canvas.getBoundingClientRect();
  const lip = pocketY(state.surfer.x, rect.height) - 86;
  const nearLip = Math.abs(state.surfer.y - lip) < 72;
  if (nearLip && state.stoke > 12) {
    state.score += 220 + state.wave * 35;
    state.stoke = Math.min(100, state.stoke + 8);
    state.message = "Clean lip hit. Stoke restored.";
    state.trickFlash = 0.55;
  } else {
    state.stoke -= 8;
    state.message = "Too far from the lip. Set it up first.";
  }
  updateHud();
}

function update(dt) {
  const rect = canvas.getBoundingClientRect();
  if (state.ended) return;

  state.time -= dt;
  if (state.time <= 0) {
    state.ended = true;
    state.message = "Session complete.";
  }

  const s = state.surfer;
  let vertical = 0;
  if (keys.has("w") || keys.has("arrowup")) vertical -= 1;
  if (keys.has("s") || keys.has("arrowdown")) vertical += 1;
  if (keys.has("a") || keys.has("arrowleft")) s.speed -= 0.9 * dt;
  if (keys.has("d") || keys.has("arrowright")) s.speed += 0.9 * dt;
  s.speed = clamp(s.speed, 0.62, 1.65);
  s.vy += vertical * 1450 * dt;
  s.vy *= 0.88;
  s.y = clamp(s.y + s.vy * dt, 74, rect.height - 70);

  const pocket = pocketY(s.x, rect.height);
  const pocketDistance = Math.abs(s.y - pocket);
  const scoring = clamp(1 - pocketDistance / 190, 0, 1);
  state.score += (24 + s.speed * 30) * scoring * dt;
  state.stoke += (scoring - 0.42) * 7 * dt;
  state.stoke = clamp(state.stoke, 0, 100);
  if (state.stoke <= 0) {
    state.ended = true;
    state.message = "Wipeout. Stoke hit zero.";
  }

  state.obstacleTimer -= dt * s.speed;
  if (state.obstacleTimer <= 0) {
    spawnObstacle(rect.width, rect.height);
    state.obstacleTimer = rand(0.8, 1.35);
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= obstacle.speed * s.speed * dt;
    if (Math.hypot(obstacle.x - s.x, obstacle.y - s.y) < obstacle.r + 28) {
      obstacle.hit = true;
      state.stoke -= obstacle.kind === "closeout" ? 22 : 15;
      state.message = obstacle.kind === "closeout" ? "Closeout slap. Get back in the pocket." : "Driftwood clipped the rail.";
    }
  }
  state.obstacles = state.obstacles.filter((o) => !o.hit && o.x > -80);

  state.foam.unshift({ x: s.x - 16, y: s.y + 20, life: 1 });
  state.foam = state.foam.slice(0, 28).map((f) => ({ ...f, life: f.life - dt * 1.6 })).filter((f) => f.life > 0);
  state.trickFlash = Math.max(0, state.trickFlash - dt);

  const nextWaveScore = state.wave * 1600;
  if (state.score > nextWaveScore) {
    state.wave += 1;
    state.stoke = Math.min(100, state.stoke + 12);
    state.message = `Wave ${state.wave}. Faster section incoming.`;
  }

  updateHud();
}

function drawBoard(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#ffd66e";
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0e4b58";
  ctx.fillRect(-16, -4, 32, 8);
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.arc(-6, -14, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-12, -8, 24, 24);
  ctx.restore();
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const t = performance.now() * 0.001;

  const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
  bg.addColorStop(0, "#68d8e2");
  bg.addColorStop(0.28, "#0e95a7");
  bg.addColorStop(1, "#075161");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, rect.width, rect.height);

  const pocket = pocketY(state.surfer.x, rect.height);
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.moveTo(0, pocket - 140);
  for (let x = 0; x <= rect.width; x += 80) {
    ctx.lineTo(x, pocket - 130 + Math.sin(x * 0.017 + t * 2.4) * 28);
  }
  ctx.lineTo(rect.width, rect.height);
  ctx.lineTo(0, rect.height);
  ctx.closePath();
  ctx.globalAlpha = 0.25;
  ctx.fill();
  ctx.globalAlpha = 1;

  for (let i = 0; i < 12; i += 1) {
    ctx.strokeStyle = `rgba(255,253,240,${0.15 + i * 0.018})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const y = pocket + i * 38;
    for (let x = 0; x <= rect.width; x += 70) {
      const yy = y + Math.sin(x * 0.02 + t * 2 + i) * 18;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  for (const foam of state.foam) {
    ctx.globalAlpha = foam.life * 0.55;
    ctx.fillStyle = "#fffdf0";
    ctx.beginPath();
    ctx.ellipse(foam.x - foam.life * 34, foam.y, 34 * (1.1 - foam.life), 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const obstacle of state.obstacles) {
    ctx.fillStyle = obstacle.kind === "closeout" ? "rgba(255,253,240,0.82)" : "#7a5133";
    ctx.beginPath();
    ctx.ellipse(obstacle.x, obstacle.y, obstacle.r * 1.35, obstacle.r, Math.sin(t), 0, Math.PI * 2);
    ctx.fill();
  }

  const angle = clamp(state.surfer.vy / 500, -0.55, 0.55);
  drawBoard(state.surfer.x, state.surfer.y, angle);

  if (state.trickFlash > 0) {
    ctx.globalAlpha = state.trickFlash;
    ctx.strokeStyle = "#ffd66e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(state.surfer.x, state.surfer.y, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(3, 38, 46, 0.72)";
  ctx.fillRect(18, 18, Math.min(520, rect.width - 36), 74);
  ctx.fillStyle = "#ffd66e";
  ctx.font = "900 14px Inter, sans-serif";
  ctx.fillText("SURFER", 36, 43);
  ctx.fillStyle = "#fffdf0";
  ctx.font = "900 22px Inter, sans-serif";
  ctx.fillText(state.message, 36, 72, Math.min(470, rect.width - 72));

  if (state.ended) {
    ctx.fillStyle = "rgba(2, 28, 34, 0.82)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd66e";
    ctx.font = "950 48px Inter, sans-serif";
    ctx.fillText("Session Over", rect.width / 2, rect.height / 2 - 18);
    ctx.fillStyle = "#fffdf0";
    ctx.font = "850 22px Inter, sans-serif";
    ctx.fillText(`${Math.round(state.score)} points · wave ${state.wave}`, rect.width / 2, rect.height / 2 + 24);
    ctx.textAlign = "left";
  }
}

function frame(now) {
  const dt = Math.min(0.035, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === " ") trick();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("resize", resize);
restartButton.addEventListener("click", reset);

resize();
reset();
requestAnimationFrame(frame);

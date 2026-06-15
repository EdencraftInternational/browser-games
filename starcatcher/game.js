const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const livesEl = document.getElementById("lives");
const timeEl = document.getElementById("time");
const restartButton = document.getElementById("restart");

const keys = new Set();
let state;
let last = performance.now();

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function reset() {
  state = {
    player: { x: 600, y: 610, vx: 0, dash: 0, invincible: 0 },
    stars: [],
    comets: [],
    score: 0,
    combo: 1,
    comboTimer: 0,
    lives: 3,
    time: 60,
    spawnStar: 0,
    spawnComet: 0,
    ended: false,
    message: "Catch falling stars. Comets break hearts and combos.",
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
  comboEl.textContent = `${state.combo}x`;
  livesEl.textContent = state.lives;
  timeEl.textContent = Math.ceil(Math.max(0, state.time));
}

function spawnStar(w) {
  state.stars.push({
    x: rand(35, w - 35),
    y: -30,
    r: rand(12, 20),
    spin: rand(0, Math.PI),
    speed: rand(120, 230),
    value: Math.random() > 0.86 ? 50 : 20,
  });
}

function spawnComet(w) {
  state.comets.push({
    x: rand(35, w - 35),
    y: -45,
    r: rand(18, 28),
    speed: rand(210, 330),
    drift: rand(-55, 55),
  });
}

function update(dt) {
  const rect = canvas.getBoundingClientRect();
  if (state.ended) return;
  state.time -= dt;
  if (state.time <= 0) {
    state.ended = true;
    state.message = "Starlight banked. Hit restart for another run.";
  }

  const player = state.player;
  let dir = 0;
  if (keys.has("a") || keys.has("arrowleft")) dir -= 1;
  if (keys.has("d") || keys.has("arrowright")) dir += 1;
  player.vx += dir * 2200 * dt;
  player.vx *= 0.84;
  player.x = clamp(player.x + player.vx * dt, 38, rect.width - 38);
  player.dash = Math.max(0, player.dash - dt);
  player.invincible = Math.max(0, player.invincible - dt);

  state.comboTimer -= dt;
  if (state.comboTimer <= 0) state.combo = 1;

  state.spawnStar -= dt;
  state.spawnComet -= dt;
  if (state.spawnStar <= 0) {
    spawnStar(rect.width);
    state.spawnStar = rand(0.26, 0.48);
  }
  if (state.spawnComet <= 0) {
    spawnComet(rect.width);
    state.spawnComet = rand(0.75, 1.2);
  }

  for (const star of state.stars) {
    star.y += star.speed * dt;
    star.spin += dt * 5;
    if (Math.hypot(star.x - player.x, star.y - player.y) < star.r + 30) {
      star.caught = true;
      state.score += star.value * state.combo;
      state.combo = Math.min(9, state.combo + 1);
      state.comboTimer = 2.2;
      state.message = star.value > 20 ? "Gold star. Combo climbing." : "Nice catch.";
    }
  }

  for (const comet of state.comets) {
    comet.y += comet.speed * dt;
    comet.x += comet.drift * dt;
    if (player.invincible <= 0 && Math.hypot(comet.x - player.x, comet.y - player.y) < comet.r + 28) {
      comet.hit = true;
      state.lives -= 1;
      state.combo = 1;
      state.comboTimer = 0;
      player.invincible = 1.1;
      state.message = state.lives > 0 ? "Comet hit. Shake it off." : "Out of lives. The sky got spicy.";
      if (state.lives <= 0) state.ended = true;
    }
  }

  state.stars = state.stars.filter((star) => !star.caught && star.y < rect.height + 60);
  state.comets = state.comets.filter((comet) => !comet.hit && comet.y < rect.height + 70);
  updateHud();
}

function dash() {
  if (state.player.dash > 0 || state.ended) return;
  let dir = 0;
  if (keys.has("a") || keys.has("arrowleft")) dir -= 1;
  if (keys.has("d") || keys.has("arrowright")) dir += 1;
  state.player.vx += (dir || 1) * 820;
  state.player.dash = 1.4;
}

function drawStar(x, y, r, spin, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const t = performance.now() * 0.001;
  const sky = ctx.createLinearGradient(0, 0, 0, rect.height);
  sky.addColorStop(0, "#090a24");
  sky.addColorStop(0.58, "#151243");
  sky.addColorStop(1, "#071320");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, rect.width, rect.height);

  for (let i = 0; i < 120; i += 1) {
    const x = (i * 83 + Math.sin(t + i) * 18) % rect.width;
    const y = (i * 47 + t * (8 + (i % 5))) % rect.height;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 6) * 0.09})`;
    ctx.fillRect(x, y, 2, 2);
  }

  for (const star of state.stars) drawStar(star.x, star.y, star.r, star.spin, star.value > 20 ? "#ffd35e" : "#dff8ff");
  for (const comet of state.comets) {
    ctx.strokeStyle = "rgba(255, 111, 86, 0.38)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(comet.x - comet.drift * 0.4, comet.y - 46);
    ctx.lineTo(comet.x, comet.y);
    ctx.stroke();
    ctx.fillStyle = "#ff705f";
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, comet.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = p.invincible > 0 ? 0.55 + Math.sin(t * 22) * 0.22 : 1;
  ctx.fillStyle = "#7bd4ff";
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(30, 25);
  ctx.lineTo(0, 14);
  ctx.lineTo(-30, 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd35e";
  ctx.fillRect(-8, 10, 16, 22);
  ctx.restore();

  ctx.fillStyle = "rgba(5, 7, 18, 0.72)";
  ctx.fillRect(18, 18, Math.min(520, rect.width - 36), 74);
  ctx.fillStyle = "#ffd35e";
  ctx.font = "900 14px Inter, sans-serif";
  ctx.fillText("STARCATCHER", 36, 43);
  ctx.fillStyle = "#f8fbff";
  ctx.font = "900 22px Inter, sans-serif";
  ctx.fillText(state.message, 36, 72, Math.min(470, rect.width - 72));

  if (state.ended) {
    ctx.fillStyle = "rgba(4, 5, 16, 0.82)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd35e";
    ctx.font = "950 48px Inter, sans-serif";
    ctx.fillText("Run Complete", rect.width / 2, rect.height / 2 - 18);
    ctx.fillStyle = "#f8fbff";
    ctx.font = "850 22px Inter, sans-serif";
    ctx.fillText(`${Math.round(state.score)} points`, rect.width / 2, rect.height / 2 + 24);
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
  if (event.key === " ") dash();
  if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("resize", resize);
restartButton.addEventListener("click", reset);

resize();
reset();
requestAnimationFrame(frame);

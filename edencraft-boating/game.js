const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const fishEl = document.getElementById("fish");
const fuelEl = document.getElementById("fuel");
const timeEl = document.getElementById("time");
const missionEl = document.getElementById("mission");
const seaStateEl = document.getElementById("seaState");
const trimReadoutEl = document.getElementById("trimReadout");
const boatNameEl = document.getElementById("boatName");
const boatTaglineEl = document.getElementById("boatTagline");
const briefingTextEl = document.getElementById("briefingText");
const ownerNoteEl = document.getElementById("ownerNote");
const boatListEl = document.getElementById("boatList");
const objectivesEl = document.getElementById("objectives");
const restartButton = document.getElementById("restart");
const trimInput = document.getElementById("trim");
const sounderInput = document.getElementById("sounder");

const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };
const world = { width: 3600, height: 2300 };

const boats = [
  {
    id: "233",
    name: "233 Formula Classic",
    stat: "24 degree deadrise | 420-600L fuel | twin fit-up",
    tagline: "The benchmark trailer boat: heritage, weight, flare and deep-V confidence.",
    colour: "#29a8aa",
    deck: "#efe9d5",
    speed: 1.02,
    handling: 0.94,
    fuel: 1.08,
    ride: 1.22,
  },
  {
    id: "60",
    name: "6.0m Offshore",
    stat: "22 degree hull | 6m2 deck | single or twin power",
    tagline: "Blue-water bite in a towable, versatile package for hardcore fishos.",
    colour: "#f2f0e5",
    deck: "#d7e1d6",
    speed: 1.04,
    handling: 1.08,
    fuel: 1.0,
    ride: 1.08,
  },
  {
    id: "565",
    name: "The 565",
    stat: "6 people | 220L fuel | take it everywhere",
    tagline: "A great all-rounder for owners who want a launch-anywhere day boat.",
    colour: "#253646",
    deck: "#efe9d5",
    speed: 1.1,
    handling: 1.18,
    fuel: 0.94,
    ride: 0.96,
  },
  {
    id: "655",
    name: "655 Centre Console",
    stat: "Centre console | owner-requested | fishing deck focus",
    tagline: "Open, practical, and built for crews who live around the deck.",
    colour: "#e6e1d0",
    deck: "#2c6e76",
    speed: 1.08,
    handling: 1.1,
    fuel: 1.02,
    ride: 1.02,
  },
  {
    id: "255",
    name: "255 Formula",
    stat: "7.77m | 24 degree deadrise | luxury offshore",
    tagline: "The big benchmark: offshore performance with comfort and range.",
    colour: "#101820",
    deck: "#ece6d4",
    speed: 0.98,
    handling: 0.9,
    fuel: 1.14,
    ride: 1.28,
  },
];

const route = [
  { id: "ramp", label: "Factory ramp", x: 340, y: 430, r: 92, type: "start" },
  { id: "bar", label: "Read the bar crossing", x: 850, y: 620, r: 88, type: "run" },
  { id: "grounds", label: "Work the offshore mark", x: 1590, y: 970, r: 108, type: "fish" },
  { id: "shelf", label: "Find the bait school", x: 2450, y: 720, r: 96, type: "fish" },
  { id: "family", label: "Family Day photo pass", x: 2870, y: 1460, r: 100, type: "run" },
  { id: "dock", label: "Return to the dock", x: 3230, y: 1900, r: 122, type: "dock" },
];

const hazards = [
  { x: 610, y: 980, r: 80, label: "reef" },
  { x: 1110, y: 1320, r: 58, label: "bommy" },
  { x: 1840, y: 520, r: 70, label: "reef" },
  { x: 2130, y: 1280, r: 92, label: "washing swell" },
  { x: 2700, y: 1010, r: 68, label: "rock" },
  { x: 3030, y: 1720, r: 64, label: "marker" },
];

let selectedBoat = boats[0];
let state;
let lastTime = performance.now();
let lastFishPress = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function createBoatButtons() {
  boatListEl.innerHTML = "";
  for (const boat of boats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "boat-card";
    button.dataset.boat = boat.id;
    button.innerHTML = `<span class="boat-icon"></span><span><strong>${boat.name}</strong><small>${boat.stat}</small></span>`;
    button.addEventListener("click", () => {
      selectedBoat = boat;
      resetGame();
    });
    boatListEl.appendChild(button);
  }
}

function resetGame() {
  state = {
    boat: {
      x: route[0].x,
      y: route[0].y,
      angle: 0.26,
      speed: 0,
      radius: selectedBoat.id === "565" ? 22 : 28,
      wake: [],
      slap: 0,
    },
    routeIndex: 1,
    score: 0,
    fish: 0,
    fuel: 100,
    timeLeft: 120,
    finished: false,
    message: "Idle out, trim it right, and head for the first mark.",
    seaPulse: 0,
    objectives: {
      bar: false,
      fish: false,
      photo: false,
      dock: false,
    },
  };
  updateSidebars();
  updateHud();
}

function updateSidebars() {
  for (const button of boatListEl.querySelectorAll(".boat-card")) {
    button.classList.toggle("active", button.dataset.boat === selectedBoat.id);
  }
  boatNameEl.textContent = selectedBoat.name;
  boatTaglineEl.textContent = selectedBoat.tagline;
  briefingTextEl.textContent = `${selectedBoat.name}: run offshore, fish two marks, make the Family Day pass, then dock with fuel and pride intact.`;
  ownerNoteEl.textContent = selectedBoat.ride > 1.15
    ? "This hull rewards confidence in rough water, but fuel burn still punishes lazy trim."
    : "This setup is nimble. Use that to pick cleaner lanes through the swell and reef.";
  renderObjectives();
}

function renderObjectives() {
  const items = [
    ["bar", "Cross the bar smoothly"],
    ["fish", "Land 5 fish across the offshore marks"],
    ["photo", "Make the Family Day photo pass"],
    ["dock", "Return to dock under control"],
  ];
  objectivesEl.innerHTML = "";
  for (const [key, label] of items) {
    const div = document.createElement("div");
    div.className = `objective ${state.objectives[key] ? "done" : ""}`;
    div.textContent = `${state.objectives[key] ? "Done" : "To do"} · ${label}`;
    objectivesEl.appendChild(div);
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * scale));
  canvas.height = Math.max(420, Math.floor(rect.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function updateHud() {
  scoreEl.textContent = Math.max(0, Math.round(state.score));
  fishEl.textContent = state.fish;
  fuelEl.textContent = Math.max(0, Math.round(state.fuel));
  timeEl.textContent = Math.ceil(Math.max(0, state.timeLeft));
  trimReadoutEl.textContent = `Trim: ${trimInput.value}%`;
  const sea = seaState();
  seaStateEl.textContent = `Sea: ${sea.label}`;
  missionEl.textContent = state.message;
}

function seaState() {
  const pulse = state.seaPulse;
  if (pulse > 0.72) return { label: "lumpy", drag: 1.22, slap: 1.0 };
  if (pulse > 0.46) return { label: "wind chop", drag: 1.1, slap: 0.58 };
  return { label: "clean", drag: 1, slap: 0.22 };
}

function getInput() {
  let turn = 0;
  let throttle = 0;
  if (keys.has("arrowleft") || keys.has("a")) turn -= 1;
  if (keys.has("arrowright") || keys.has("d")) turn += 1;
  if (keys.has("arrowup") || keys.has("w")) throttle += 1;
  if (keys.has("arrowdown") || keys.has("s")) throttle -= 1;

  if (pointer.active) {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width * 0.5;
    const centerY = rect.height * 0.6;
    turn += clamp((pointer.x - centerX) / 210, -1, 1);
    throttle += pointer.y < centerY - 16 ? 1 : pointer.y > centerY + 50 ? -0.7 : 0;
  }

  return { turn: clamp(turn, -1, 1), throttle: clamp(throttle, -1, 1) };
}

function fishNow() {
  if (state.finished) return;
  const now = performance.now();
  if (now - lastFishPress < 550) return;
  lastFishPress = now;
  const mark = route[state.routeIndex];
  const focus = Number(sounderInput.value) / 100;
  const speedOk = Math.abs(state.boat.speed) < 95;
  if (mark && mark.type === "fish" && dist(state.boat, mark) < mark.r && speedOk) {
    const catchCount = focus > 0.42 && focus < 0.86 ? 2 : 1;
    state.fish += catchCount;
    state.score += catchCount * 120;
    state.message = catchCount > 1 ? "Sounder lit up. Double hook-up." : "Fish on. Keep working the mark.";
    if (state.fish >= 5) state.objectives.fish = true;
    advanceRoute();
  } else if (mark?.type === "fish") {
    state.message = "Ease off on the mark before dropping lines.";
  } else {
    state.message = "Save the fishing for the marked grounds.";
  }
  renderObjectives();
  updateHud();
}

function advanceRoute() {
  const mark = route[state.routeIndex];
  if (!mark) return;
  if (mark.type === "run") {
    if (mark.id === "bar") state.objectives.bar = true;
    if (mark.id === "family") state.objectives.photo = true;
  }
  if (mark.type === "dock") state.objectives.dock = true;
  state.routeIndex = Math.min(route.length - 1, state.routeIndex + 1);
  renderObjectives();
}

function update(dt) {
  if (state.finished) return;

  state.timeLeft -= dt;
  state.seaPulse = (Math.sin(performance.now() * 0.00055) + Math.sin(performance.now() * 0.00021 + 2.4) + 2) / 4;
  if (state.timeLeft <= 0) {
    endRun("Time ran out. The fish won this one.");
    return;
  }

  const boat = state.boat;
  const input = getInput();
  const trim = Number(trimInput.value) / 100;
  const trimSweetness = 1 - Math.abs(trim - 0.58) * 0.72;
  const sea = seaState();
  const rideBuffer = lerp(0.78, selectedBoat.ride, trimSweetness);
  const roughPenalty = sea.drag / rideBuffer;
  const accel = 255 * selectedBoat.speed * trimSweetness;

  boat.speed += input.throttle * accel * dt;
  boat.speed *= 1 - (0.011 * roughPenalty);
  boat.speed = clamp(boat.speed, -100, 390 * selectedBoat.speed);
  boat.angle += input.turn * (1.65 * selectedBoat.handling + Math.abs(boat.speed) / 380) * dt;
  boat.x += Math.cos(boat.angle) * boat.speed * dt;
  boat.y += Math.sin(boat.angle) * boat.speed * dt;
  boat.x = clamp(boat.x, 80, world.width - 80);
  boat.y = clamp(boat.y, 80, world.height - 80);
  boat.slap = Math.max(0, sea.slap * Math.abs(boat.speed) / 340 - selectedBoat.ride * 0.08);

  const burn = (0.018 + Math.abs(boat.speed) / 12500) * roughPenalty / selectedBoat.fuel;
  state.fuel -= burn * dt * 60;
  if (state.fuel <= 0) {
    state.fuel = 0;
    endRun("Out of fuel. Great hulls still need a fuel plan.");
    return;
  }

  boat.wake.unshift({
    x: boat.x - Math.cos(boat.angle) * 44,
    y: boat.y - Math.sin(boat.angle) * 44,
    angle: boat.angle,
    life: 1,
  });
  boat.wake = boat.wake.slice(0, 34).map((w) => ({ ...w, life: w.life - dt * 1.25 })).filter((w) => w.life > 0);

  for (const hazard of hazards) {
    const d = Math.hypot(boat.x - hazard.x, boat.y - hazard.y);
    const min = boat.radius + hazard.r;
    if (d < min) {
      const nx = (boat.x - hazard.x) / (d || 1);
      const ny = (boat.y - hazard.y) / (d || 1);
      boat.x = hazard.x + nx * min;
      boat.y = hazard.y + ny * min;
      boat.speed *= -0.42;
      state.score = Math.max(0, state.score - 80);
      state.message = `Too close to the ${hazard.label}. Pick a cleaner line.`;
    }
  }

  const mark = route[state.routeIndex];
  if (mark && dist(boat, mark) < mark.r) {
    if (mark.type === "run") {
      state.score += mark.id === "family" ? 180 : 130;
      state.message = mark.id === "family" ? "Photo pass nailed. Bring it home." : "Bar read nicely. Offshore mark next.";
      advanceRoute();
    } else if (mark.type === "dock") {
      if (state.fish >= 5 && Math.abs(boat.speed) < 95) {
        state.score += Math.ceil(state.timeLeft) * 15 + Math.round(state.fuel) * 8;
        state.objectives.dock = true;
        renderObjectives();
        endRun("Docked clean. Owner run complete.");
      } else if (state.fish < 5) {
        state.message = "The crew wants five fish before calling it.";
      } else {
        state.message = "Too hot for the dock. Ease off and settle it.";
      }
    } else {
      state.message = "On the mark. Slow down and press Space to fish.";
    }
  } else if (mark) {
    state.message = `Next: ${mark.label}`;
  }

  updateHud();
}

function endRun(message) {
  state.finished = true;
  state.message = message;
  updateHud();
}

function camera() {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(state.boat.x - rect.width / 2, 0, world.width - rect.width),
    y: clamp(state.boat.y - rect.height / 2, 0, world.height - rect.height),
    width: rect.width,
    height: rect.height,
  };
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const cam = camera();
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawWater();
  drawLand();
  drawRoute();
  drawHazards();
  drawBoat();
  ctx.restore();
  drawOverlay(rect);
}

function drawWater() {
  const now = performance.now() * 0.001;
  ctx.fillStyle = "#166f83";
  ctx.fillRect(0, 0, world.width, world.height);

  for (let y = 0; y < world.height; y += 58) {
    for (let x = 0; x < world.width; x += 72) {
      const alpha = 0.08 + Math.max(0, Math.sin(x * 0.01 + y * 0.006 + now) * 0.06);
      ctx.fillStyle = `rgba(190, 242, 239, ${alpha})`;
      ctx.fillRect(x, y + Math.sin(now + x * 0.01) * 8, 46, 4);
    }
  }

  for (let i = 0; i < 10; i += 1) {
    ctx.strokeStyle = `rgba(243, 241, 230, ${0.07 + i * 0.006})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const y = 360 + i * 145 + Math.sin(now + i) * 18;
    for (let x = 0; x <= world.width; x += 140) {
      const waveY = y + Math.sin(x * 0.008 + now * 1.2 + i) * 30;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
}

function drawLand() {
  drawCoast(0, 0, 500, 640, "#e0c574", "#2f7a47");
  drawCoast(3050, 1580, 520, 680, "#d3b267", "#3a8252");
  drawCoast(2800, 0, 780, 360, "#d9c072", "#2d6a43");
  drawDock(3190, 1870);
}

function drawCoast(x, y, w, h, sand, grass) {
  const block = 48;
  for (let yy = y; yy < y + h; yy += block) {
    for (let xx = x; xx < x + w; xx += block) {
      const edge = xx < x + block * 1.4 || yy < y + block * 1.4 || xx > x + w - block * 2 || yy > y + h - block * 2;
      ctx.fillStyle = edge ? sand : grass;
      ctx.fillRect(xx, yy, block, block);
      ctx.strokeStyle = "rgba(20, 30, 25, 0.18)";
      ctx.strokeRect(xx + 0.5, yy + 0.5, block - 1, block - 1);
    }
  }
}

function drawDock(x, y) {
  ctx.fillStyle = "#6f4d2c";
  ctx.fillRect(x, y, 270, 150);
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 ? "#7f5a34" : "#946b3e";
    ctx.fillRect(x + i * 34, y, 24, 150);
  }
  ctx.fillStyle = "#f3f1e6";
  ctx.font = "900 24px Inter, sans-serif";
  ctx.fillText("EDENCRAFT DOCK", x + 28, y + 84);
}

function drawRoute() {
  ctx.strokeStyle = "rgba(243, 241, 230, 0.26)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 16]);
  ctx.beginPath();
  for (let i = 0; i < route.length; i += 1) {
    if (i === 0) ctx.moveTo(route[i].x, route[i].y);
    else ctx.lineTo(route[i].x, route[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < route.length; i += 1) {
    const mark = route[i];
    const active = i === state.routeIndex;
    const done = i < state.routeIndex;
    ctx.fillStyle = done ? "rgba(125, 216, 221, 0.28)" : active ? "rgba(201, 154, 69, 0.32)" : "rgba(7, 16, 22, 0.28)";
    ctx.strokeStyle = active ? "#c99a45" : done ? "#7dd8dd" : "rgba(243, 241, 230, 0.32)";
    ctx.lineWidth = active ? 4 : 2;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, mark.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f3f1e6";
    ctx.font = "850 22px Inter, sans-serif";
    ctx.fillText(mark.label, mark.x - mark.r + 14, mark.y - mark.r - 12);
  }
}

function drawHazards() {
  for (const hazard of hazards) {
    ctx.fillStyle = hazard.label === "washing swell" ? "rgba(243, 241, 230, 0.16)" : "#647077";
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.beginPath();
    ctx.arc(hazard.x - hazard.r * 0.25, hazard.y - hazard.r * 0.24, hazard.r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoat() {
  const boat = state.boat;
  for (const wake of boat.wake) {
    ctx.save();
    ctx.globalAlpha = wake.life * 0.5;
    ctx.translate(wake.x, wake.y);
    ctx.rotate(wake.angle);
    ctx.strokeStyle = "#e8ffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-8, -18, 32 * (1.08 - wake.life), 0.2, 2.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-8, 18, 32 * (1.08 - wake.life), -2.6, -0.2);
    ctx.stroke();
    ctx.restore();
  }

  const slap = Math.sin(performance.now() * 0.018) * state.boat.slap * 4;
  ctx.save();
  ctx.translate(boat.x, boat.y + slap);
  ctx.rotate(boat.angle);

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(-5, 7, 68, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = selectedBoat.colour;
  ctx.beginPath();
  ctx.moveTo(72, 0);
  ctx.lineTo(34, -30);
  ctx.lineTo(-54, -25);
  ctx.lineTo(-72, -10);
  ctx.lineTo(-72, 10);
  ctx.lineTo(-54, 25);
  ctx.lineTo(34, 30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f3f1e6";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = selectedBoat.deck;
  ctx.fillRect(-36, -16, 56, 32);
  ctx.fillStyle = "#111820";
  ctx.fillRect(2, -12, 20, 24);
  ctx.fillStyle = selectedBoat.id === "655" ? "#f3f1e6" : "#0b1b22";
  ctx.fillRect(-44, -20, 15, 40);
  ctx.fillStyle = "#c99a45";
  ctx.fillRect(-61, -11, 16, 22);
  ctx.restore();
}

function drawOverlay(rect) {
  ctx.fillStyle = "rgba(7, 16, 22, 0.78)";
  ctx.fillRect(18, 18, Math.min(570, rect.width - 36), 92);
  ctx.strokeStyle = "rgba(201, 154, 69, 0.42)";
  ctx.strokeRect(18.5, 18.5, Math.min(570, rect.width - 36) - 1, 91);
  ctx.fillStyle = "#c99a45";
  ctx.font = "900 14px Inter, sans-serif";
  ctx.fillText(selectedBoat.name.toUpperCase(), 38, 46);
  ctx.fillStyle = "#f3f1e6";
  ctx.font = "900 24px Inter, sans-serif";
  ctx.fillText(state.message, 38, 78, Math.min(520, rect.width - 76));
  ctx.fillStyle = "#b7c3c5";
  ctx.font = "750 14px Inter, sans-serif";
  ctx.fillText("Ride angle, fuel, swell and sounder focus all matter.", 38, 98, Math.min(520, rect.width - 76));

  if (!state.finished) return;
  ctx.fillStyle = "rgba(4, 11, 15, 0.82)";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#c99a45";
  ctx.font = "950 15px Inter, sans-serif";
  ctx.fillText("EDENCRAFT OWNER RUN", rect.width / 2, rect.height / 2 - 72);
  ctx.fillStyle = "#f3f1e6";
  ctx.font = "950 48px Inter, sans-serif";
  ctx.fillText(state.objectives.dock ? "Legend Status" : "Run Logged", rect.width / 2, rect.height / 2 - 24);
  ctx.fillStyle = "#dce8e9";
  ctx.font = "850 20px Inter, sans-serif";
  ctx.fillText(`${Math.round(state.score)} pts · ${state.fish} fish · ${Math.round(state.fuel)}% fuel`, rect.width / 2, rect.height / 2 + 18);
  ctx.fillStyle = "#9fb2b6";
  ctx.font = "750 15px Inter, sans-serif";
  ctx.fillText("Choose a hull or hit New Run to go again.", rect.width / 2, rect.height / 2 + 52);
  ctx.textAlign = "left";
}

function frame(now) {
  const dt = Math.min(0.035, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === " ") fishNow();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("resize", resizeCanvas);
restartButton.addEventListener("click", resetGame);
trimInput.addEventListener("input", updateHud);
sounderInput.addEventListener("input", updateHud);

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.x = event.offsetX;
  pointer.y = event.offsetY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  pointer.x = event.offsetX;
  pointer.y = event.offsetY;
});
canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

createBoatButtons();
resizeCanvas();
resetGame();
requestAnimationFrame(frame);

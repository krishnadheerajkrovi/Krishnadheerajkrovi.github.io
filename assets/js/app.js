const navLinks = document.querySelector("#navLinks");
const navToggle = document.querySelector(".mobile-toggle");
const sectionLinks = [...document.querySelectorAll(".nav-links a")];

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

sectionLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

function revealWhenInView(node) {
  const rect = node.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    node.classList.add("is-visible");
    return;
  }
  revealObserver.observe(node);
}

document.querySelectorAll(".reveal").forEach(revealWhenInView);
window.addEventListener("pageshow", () => {
  document.querySelectorAll(".reveal:not(.is-visible)").forEach(revealWhenInView);
});

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-42% 0px -50% 0px", threshold: 0.01 }
);

["impact", "work", "projects", "skills", "contact"].forEach((id) => {
  const section = document.getElementById(id);
  if (section) navObserver.observe(section);
});

const canvas = document.getElementById("signal-canvas");
const ctx = canvas.getContext("2d");
const panel = canvas.parentElement;
const colors = ["#16735f", "#285aa9", "#ad493d", "#a46b14", "#6653a5"];
let nodes = [];
let width = 0;
let height = 0;
let frame = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resizeCanvas() {
  const rect = panel.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(320, rect.width);
  height = Math.max(360, rect.height);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.round(Math.min(38, Math.max(18, width / 15)));
  nodes = Array.from({ length: count }, (_, index) => ({
    x: 28 + ((index * 83) % Math.max(120, width - 56)),
    y: 32 + ((index * 137) % Math.max(180, height - 150)),
    vx: ((index % 5) - 2) * 0.08,
    vy: (((index + 2) % 7) - 3) * 0.06,
    size: 4 + (index % 3),
    color: colors[index % colors.length]
  }));
  drawSignal();
}

function drawSignal() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 250, 240, 0.2)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(23, 33, 31, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  nodes.forEach((node) => {
    if (!reducedMotion) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 22 || node.x > width - 22) node.vx *= -1;
      if (node.y < 22 || node.y > height - 170) node.vy *= -1;
    }
  });

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < 112) {
        ctx.globalAlpha = Math.max(0, 0.42 - distance / 270);
        ctx.strokeStyle = a.color;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  nodes.forEach((node, index) => {
    const pulse = reducedMotion ? 0 : Math.sin(frame / 22 + index) * 1.2;
    ctx.fillStyle = node.color;
    ctx.fillRect(node.x - node.size / 2, node.y - node.size / 2, node.size + pulse, node.size + pulse);
    ctx.strokeStyle = "rgba(255, 250, 240, 0.9)";
    ctx.strokeRect(node.x - node.size / 2 - 2, node.y - node.size / 2 - 2, node.size + 4, node.size + 4);
  });

  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = "#17211f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, height * 0.2);
  ctx.bezierCurveTo(width * 0.28, height * 0.08, width * 0.56, height * 0.38, width - 38, height * 0.26);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (!reducedMotion) {
    frame += 1;
    requestAnimationFrame(drawSignal);
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

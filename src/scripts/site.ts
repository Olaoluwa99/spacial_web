import { springSamples, springPresets } from "./spring";

const media = window.matchMedia("(prefers-reduced-motion: reduce)");
const menuToggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const mobileNav = document.querySelector<HTMLElement>("#mobile-nav");
menuToggle?.addEventListener("click", () => {
  if (!mobileNav) return;
  const expanded = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(expanded));
  menuToggle.setAttribute(
    "aria-label",
    expanded ? "Close navigation" : "Open navigation",
  );
  mobileNav.hidden = !expanded;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileNav && menuToggle && !mobileNav.hidden) {
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.focus();
  }
});

const filterButtons =
  document.querySelectorAll<HTMLButtonElement>("[data-filter]");
filterButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((b) =>
      b.setAttribute("aria-pressed", String(b === button)),
    );
    let count = 0;
    document
      .querySelectorAll<HTMLElement>("[data-style-card]")
      .forEach((card) => {
        const visible =
          filter === "All styles" || card.dataset.category === filter;
        card.hidden = !visible;
        if (visible) count++;
      });
    const label = document.querySelector("[data-collection-count]");
    if (label)
      label.textContent = `${String(count).padStart(2, "0")} ${count === 1 ? "style" : "styles"} to explore`;
  }),
);

const names: Record<string, string> = {
  glassmorphism: "Glassmorphism",
  "neo-brutalism": "Neo-brutalism",
  "kinetic-type": "Kinetic type",
  "aurora-shaders": "Aurora shaders",
  claymorphism: "Claymorphism",
  "bento-motion": "Bento motion",
};
const dialog = document.querySelector<HTMLDialogElement>("#preview-dialog");
const frame = document.querySelector<HTMLIFrameElement>("#preview-frame");
let previewOpener: HTMLElement | null = null;
document
  .querySelectorAll<HTMLButtonElement>("[data-preview]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.preview;
      if (!id || !names[id] || !dialog || !frame) return;
      const heading = dialog.querySelector("#preview-heading");
      if (heading) heading.textContent = names[id];
      frame.title = `${names[id]} live showcase`;
      frame.src = `/demos/${id}/example.html`;
      const detailLink = dialog.querySelector<HTMLAnchorElement>(
        "#preview-detail-link",
      );
      if (detailLink) detailLink.href = `/styles/${id}/`;
      previewOpener = button;
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }),
  );
dialog
  ?.querySelector("[data-close-preview]")
  ?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
});
dialog?.addEventListener("close", () => {
  frame?.removeAttribute("src");
  document.body.style.overflow = "";
  previewOpener?.focus();
});

document
  .querySelectorAll<HTMLButtonElement>("[data-demo-size]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-demo-size]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      const device = document.querySelector<HTMLElement>("[data-demo-device]");
      device?.toggleAttribute("data-wide", button.dataset.demoSize === "wide");
    }),
  );

async function copyText(text: string, button: HTMLButtonElement) {
  const originalLabel = button.getAttribute("aria-label");
  try {
    await navigator.clipboard.writeText(text);
    button.setAttribute("aria-label", "Copied to clipboard");
    const old = button.innerHTML;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.innerHTML = old;
      if (originalLabel) button.setAttribute("aria-label", originalLabel);
      else button.removeAttribute("aria-label");
    }, 1600);
  } catch {
    // Keep the snippet selectable when clipboard access is unavailable.
    button.setAttribute(
      "aria-label",
      "Copy unavailable; select the text to copy",
    );
  }
}
document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((button) =>
  button.addEventListener("click", () => {
    void copyText(button.dataset.copy || "", button);
  }),
);

let exhibitAnimation: Animation | undefined;
let activePreset: keyof typeof springPresets = "calm";
const exhibit = document.querySelector<HTMLElement>("[data-motion-exhibit]");
const cube = exhibit?.querySelector<HTMLElement>("[data-motion-cube]");
function replayExhibit() {
  if (!cube || !exhibit) return;
  exhibitAnimation?.cancel();
  const distance = Math.max(
    0,
    cube.parentElement!.clientWidth - cube.offsetWidth,
  );
  if (media.matches) {
    cube.style.transform = `translateX(${distance}px)`;
    return;
  }
  cube.style.transform = "";
  const preset = springPresets[activePreset];
  const samples = springSamples(preset.stiffness, preset.damping);
  exhibitAnimation = cube.animate(
    samples.values.map((value) => ({
      transform: `translateX(${value * distance}px) rotate(${value * 90}deg)`,
    })),
    { duration: samples.duration, fill: "forwards" },
  );
}
exhibit
  ?.querySelectorAll<HTMLButtonElement>("[data-motion-preset]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const key = button.dataset.motionPreset as keyof typeof springPresets;
      if (!springPresets[key]) return;
      activePreset = key;
      exhibit
        .querySelectorAll("[data-motion-preset]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      const description = exhibit.querySelector("[data-motion-description]");
      if (description) description.textContent = springPresets[key].description;
      replayExhibit();
    }),
  );
exhibit
  ?.querySelector("[data-motion-replay]")
  ?.addEventListener("click", replayExhibit);

const workbench = document.querySelector<HTMLElement>(
  "[data-spring-workbench]",
);
const stiffness = document.querySelector<HTMLInputElement>("#stiffness");
const damping = document.querySelector<HTMLInputElement>("#damping");
const springObject = workbench?.querySelector<HTMLElement>(
  "[data-spring-object]",
);
let springAnimation: Animation | undefined;
let exportedCss = "";
function updateSpring(animate = true) {
  if (!stiffness || !damping || !springObject || !workbench) return;
  const k = Number(stiffness.value),
    ratio = Number(damping.value);
  const values = springSamples(k, ratio);
  const stiffnessValue = document.querySelector("#stiffness-value");
  const dampingValue = document.querySelector("#damping-value");
  if (stiffnessValue) stiffnessValue.textContent = String(k);
  if (dampingValue) dampingValue.textContent = ratio.toFixed(2);
  exportedCss = `.element {\n  transition: transform ${values.duration}ms\n    linear(${values.values.map((v) => Number(v.toFixed(4))).join(", ")});\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .element { transition: none; }\n}`;
  const code = workbench.querySelector("[data-spring-code]");
  if (code) code.textContent = exportedCss;
  const status = workbench.querySelector("[data-spring-status]");
  if (status)
    status.textContent = media.matches
      ? "Reduced motion: instant arrival."
      : `${values.duration}ms to settle · stiffness ${k} · damping ${ratio.toFixed(2)}`;
  if (!animate) return;
  springAnimation?.cancel();
  const distance = Math.max(
    0,
    springObject.parentElement!.clientWidth - springObject.offsetWidth,
  );
  if (media.matches) {
    springObject.style.transform = `translateX(${distance}px)`;
    return;
  }
  springObject.style.transform = "";
  springAnimation = springObject.animate(
    values.values.map((value) => ({
      transform: `translateX(${value * distance}px)`,
    })),
    { duration: values.duration, fill: "forwards" },
  );
}
[stiffness, damping].forEach((input) =>
  input?.addEventListener("input", () => {
    workbench
      ?.querySelectorAll("[data-spring-preset]")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
    updateSpring();
  }),
);
workbench
  ?.querySelectorAll<HTMLButtonElement>("[data-spring-preset]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const key = button.dataset.springPreset as keyof typeof springPresets;
      if (!springPresets[key] || !stiffness || !damping) return;
      stiffness.value = String(springPresets[key].stiffness);
      damping.value = String(springPresets[key].damping);
      workbench
        .querySelectorAll("[data-spring-preset]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      updateSpring();
    }),
  );
workbench
  ?.querySelector("[data-spring-replay]")
  ?.addEventListener("click", () => updateSpring());
workbench
  ?.querySelector<HTMLButtonElement>("[data-copy-spring]")
  ?.addEventListener("click", (event) => {
    void copyText(exportedCss, event.currentTarget as HTMLButtonElement);
  });
updateSpring(false);
media.addEventListener("change", () => {
  exhibitAnimation?.cancel();
  springAnimation?.cancel();
  if (cube) cube.style.transform = "";
  if (springObject) springObject.style.transform = "";
  updateSpring(false);
});
// Keep animated objects inside their tracks after a responsive layout change.
let resizeTimer: number;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    exhibitAnimation?.cancel();
    springAnimation?.cancel();
    if (cube) cube.style.transform = "";
    if (springObject) springObject.style.transform = "";
  }, 150);
});

/*
 * Special · Aurora shaders for the web.
 *
 * A tiny, dependency-free WebGL helper that runs one fragment shader on a <canvas>,
 * plus the style's programs. The GLSL here is the AGSL from
 * platforms/compose/ShaderPrograms.kt with only the dialect changed
 * (vec/float2, gl_FragCoord/fragCoord), so the web and Android draw the same pixels.
 *
 *   <div class="shader-backdrop"><canvas></canvas></div>
 *   const aurora = AuroraShaders.mount(canvas, AuroraShaders.programs.aurora, () => ({ ... }));
 *   if (!aurora) { ... }   // no WebGL: the CSS gradient behind the canvas stays visible
 *
 * Loads as a classic <script> (sets window.AuroraShaders) or as a CommonJS/ESM-interop
 * module (import AuroraShaders from "./shader.js").
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AuroraShaders = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Mirrors tokens.json and motion.json.
  const tokens = {
    void: "#06050f",
    aurora: ["#2df5c4", "#3c6eff", "#8b5cf6", "#f0459c"], // mint, azure, violet, rose
    shader: {
      flow: 0.06, scale: 1.6, warp: 1.2, intensity: 0.9, grain: 0.07, hueShift: 0,
      veil: 0.75, foil: 0.75, glow: 0.6, aberration: 1.5, renderScale: 0.5,
    },
    motion: {
      emerge: { dampingRatio: 0.82, stiffness: 170 },
      tilt: { dampingRatio: 0.45, stiffness: 190, maxDegrees: 14 },
      press: { dampingRatio: 0.6, stiffness: 900, scale: 0.97 },
      grainFps: 24,
      ripple: { durationMs: 900, amplitude: 14, width: 56 },
      shimmerTurnSeconds: 6,
      foilDriftSeconds: 14,
    },
  };

  // Shared by every program. Cheap on purpose: a sine-free hash, 2D value noise and
  // four octaves of fbm. Each fbm() costs 4 noise() = 16 hash() calls.
  const NOISE = `
precision highp float;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p = vec2(0.8 * p.x - 0.6 * p.y, 0.6 * p.x + 0.8 * p.y) * 2.03 + 11.7;
    amp *= 0.5;
  }
  return v;
}

uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;

// Four hues, clamped at the ends.
vec3 palette(float x) {
  x = clamp(x, 0.0, 1.0) * 3.0;
  vec3 col = mix(c0, c1, clamp(x, 0.0, 1.0));
  col = mix(col, c2, clamp(x - 1.0, 0.0, 1.0));
  return mix(col, c3, clamp(x - 2.0, 0.0, 1.0));
}

// Four hues around a loop, for foil and borders.
vec3 spectrum(float x) {
  x = fract(x) * 4.0;
  vec3 col = mix(c0, c1, clamp(x, 0.0, 1.0));
  col = mix(col, c2, clamp(x - 1.0, 0.0, 1.0));
  col = mix(col, c3, clamp(x - 2.0, 0.0, 1.0));
  return mix(col, c0, clamp(x - 3.0, 0.0, 1.0));
}
`;

  const programs = {
    /*
     * The backdrop: noise field -> domain warp -> gradient map.
     * Uniforms match AGSL. \`stage\` stops the pipeline early (0 noise, 1 warp, 2 colour).
     * On the web the ripple is folded in here (a DOM element can't be distorted), by
     * offsetting where the field is sampled; that is exactly what distorting the image does.
     */
    aurora: NOISE + `
uniform vec2 resolution;
uniform float time;
uniform float scale;
uniform float warp;
uniform float intensity;
uniform float stage;
uniform vec3 voidColor;
uniform vec4 ripple;      // x, y (px), radius (px), amplitude (px); 0 amplitude = off
uniform float rippleWidth; // px

void main() {
  vec2 xy = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);

  if (ripple.w > 0.0) {
    vec2 d = xy - ripple.xy;
    float dist = length(d);
    float x = (dist - ripple.z) / rippleWidth;
    xy -= d / max(dist, 1.0) * ripple.w * x * exp(-x * x);
  }

  vec2 p = xy / min(resolution.x, resolution.y) * scale;
  float t = time;

  // 1 · Noise field: soft value-noise clouds drifting upwards.
  if (stage < 0.5) {
    gl_FragColor = vec4(vec3(fbm(p + vec2(0.0, t))), 1.0);
    return;
  }

  // 2 · Domain warp: look the field up somewhere else, offset by two more fields.
  vec2 q = vec2(fbm(p + vec2(1.7, 9.2) + 0.5 * t), fbm(p + vec2(8.3, 2.8) - 0.4 * t));
  float f = fbm(p + warp * q + vec2(0.0, t));
  if (stage < 1.5) {
    gl_FragColor = vec4(vec3(f), 1.0);
    return;
  }

  // 3 · Gradient map: the field picks a hue, and only its ridges light up.
  vec3 hue = palette(0.5 + (q.y - q.x) * 2.8 + (f - 0.5) * 0.6);
  float glow = smoothstep(0.2, 0.88, f);
  vec3 col = mix(voidColor, hue, glow * glow * intensity);
  // A thin contour of the field: the bright threads that make it read as aurora.
  float x = (f - 0.56) * 22.0;
  col += mix(hue, vec3(1.0), 0.25) * exp(-x * x) * glow * 0.8 * intensity;
  gl_FragColor = vec4(col, 1.0);
}
`,

    /*
     * Holographic foil, drawn over the card with screen blending. Bands of the
     * four hues run diagonally and slide with tilt, a soft specular hotspot sits
     * opposite the tilt, and sparse glitter cells twinkle as the angle changes.
     */
    foil: NOISE + `
uniform vec2 resolution;
uniform vec2 tilt;        // -1..1 each axis
uniform float time;
uniform float strength;
uniform float density;    // device px per dp

void main() {
  vec2 xy = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
  vec2 uv = xy / resolution;

  float phase = dot(uv - 0.5, vec2(0.9, 0.55)) * 2.6 + tilt.x * 0.55 + tilt.y * 0.35 + time * 0.05;
  phase += (noise(uv * vec2(14.0, 5.0)) - 0.5) * 0.3;
  vec3 bands = spectrum(phase);
  // Fine diffraction lines, the tell of real foil.
  bands *= 0.9 + 0.1 * sin(phase * 70.0);

  vec2 light = vec2(0.5) - tilt * 0.5;
  float spec = exp(-length((uv - light) * vec2(1.0, 1.5)) * 3.2);

  vec2 cell = floor(xy / (2.0 * density));
  float h = hash(cell);
  float sparkle = step(0.975, h) * pow(0.5 + 0.5 * sin(h * 80.0 + dot(tilt, vec2(9.0, 6.0))), 12.0);

  float sheen = (0.3 + 0.7 * spec) * strength;
  vec3 col = bands * sheen + vec3(spec * spec * 0.45 + sparkle * 0.8) * strength;
  gl_FragColor = vec4(col, 1.0);
}
`,
  };

  function rgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  /** Rotates a colour's hue, using the same matrix as CSS hue-rotate() and the Android code. */
  function hueRotate([r, g, b], degrees) {
    if (!degrees) return [r, g, b];
    const a = degrees * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const m = [
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ];
    const clamp = (v) => Math.min(1, Math.max(0, v));
    return [
      clamp(m[0] * r + m[1] * g + m[2] * b),
      clamp(m[3] * r + m[4] * g + m[5] * b),
      clamp(m[6] * r + m[7] * g + m[8] * b),
    ];
  }

  /** The four aurora hues, hue-shifted, as c0..c3 uniforms. */
  function paletteUniforms(hueShift = 0) {
    const out = {};
    tokens.aurora.forEach((hex, i) => { out["c" + i] = hueRotate(rgb(hex), hueShift); });
    return out;
  }

  const prefersReducedMotion = () =>
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let support;
  function supported() {
    if (support === undefined) {
      try {
        support = !!document.createElement("canvas").getContext("webgl");
      } catch (e) {
        support = false;
      }
    }
    return support;
  }

  /**
   * One damped spring step (mass 1), for tilt and presses driven from JS.
   * Returns [value, velocity]. Same damping ratio + stiffness as motion.json.
   */
  function springStep(value, velocity, target, dt, { dampingRatio, stiffness }) {
    const damping = 2 * dampingRatio * Math.sqrt(stiffness);
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      velocity += (-stiffness * (value - target) - damping * velocity) * h;
      value += velocity * h;
    }
    return [value, velocity];
  }

  /**
   * Film grain as a tiling data-URL texture: half the pixels lighten, half darken.
   * Grain is a separate full-resolution overlay, so the backdrop can render at half res.
   */
  function grainTexture(size = 128, seed = 7) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(size, size);
    let s = seed;
    const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < size * size; i++) {
      const light = random() > 0.5;
      const v = light ? 255 : 0;
      image.data.set([v, v, v, Math.round(random() * 127)], i * 4);
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL();
  }

  /**
   * Runs [source] on [canvas] every frame until stopped.
   *
   * uniforms(time, size) returns an object of uniform values (numbers or arrays of
   * 2–4 numbers); it is called each frame with motion time in seconds.
   * Options: renderScale (fraction of device pixels to render, default 1),
   * stillTime (time used under reduced motion), motionScale (slow-motion factor).
   *
   * Returns null when WebGL or the program is unavailable.
   */
  function mount(canvas, source, uniforms, options = {}) {
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: true, alpha: true });
    if (!gl) return null;

    const vertex = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
    const program = gl.createProgram();
    for (const [type, text] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, source]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("AuroraShaders:", gl.getShaderInfoLog(shader));
        return null;
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    // One triangle that covers the viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const locations = {};
    const set = (name, value) => {
      if (!(name in locations)) locations[name] = gl.getUniformLocation(program, name);
      const at = locations[name];
      if (at === null) return;
      if (typeof value === "number") gl.uniform1f(at, value);
      else gl[`uniform${value.length}fv`](at, value);
    };

    const state = {
      motionScale: options.motionScale ?? 1,
      time: 0,
      stopped: false,
      visible: true,
    };
    const renderScale = options.renderScale ?? 1;
    const still = options.stillTime ?? 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * renderScale;
      const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      return { width: w, height: h, ratio };
    }

    function draw(time) {
      const size = resize();
      set("resolution", [size.width, size.height]);
      const values = uniforms(time, size);
      for (const name in values) set(name, values[name]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let last = 0;
    function frame(now) {
      if (state.stopped) return;
      const reduced = prefersReducedMotion();
      if (last && !reduced) state.time += (now - last) / 1000 / state.motionScale;
      last = now;
      if (state.visible) draw(reduced ? still : state.time);
      requestAnimationFrame(frame);
    }

    // Don't spend GPU time on canvases scrolled out of view.
    let observer;
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; });
      observer.observe(canvas);
    }

    draw(prefersReducedMotion() ? still : 0);
    requestAnimationFrame(frame);

    return {
      canvas,
      get time() { return state.time; },
      set motionScale(value) { state.motionScale = value; },
      render() { draw(prefersReducedMotion() ? still : state.time); },
      stop() {
        state.stopped = true;
        observer?.disconnect();
      },
    };
  }

  return { tokens, programs, mount, rgb, hueRotate, paletteUniforms, prefersReducedMotion, supported, springStep, grainTexture };
});

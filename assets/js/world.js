import * as THREE from '../vendor/three.module.min.js';
import * as Shape from './shapes.js';
import { prints, WATER_REST, SAND } from './prints.js';


THREE.ColorManagement.enabled = false;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

const CAM_Z = 10;
const FOV = 35;

const particleVert = /* glsl */ `
  attribute vec2 aIdx;
  attribute vec4 aRand;
  uniform highp sampler2D tA, tB;
  uniform mat4 uMA, uMB;
  uniform float uMix, uTime, uPx, uVel, uIntro;
  uniform float uWaveA, uWaveB, uSplitA, uSplitB, uAccA, uAccB, uRipA, uRipB, uCodeA, uCodeB, uPrA, uPrB;
  uniform float uReveal, uFront, uFrontLow, uWet;
  uniform vec2 uMouse, uMouseV;
  uniform vec3 uShock;
  varying float vL, vAcc, vLeaf;
  varying vec4 vTint;

  float seaH(vec2 p) {
    float h = 0.0, t = uTime;
    h += 0.5 * (exp(sin(dot(vec2(0.15, 1.0), p) * 0.26 + t * 0.55)) - 1.0) / 1.718;
    h += 0.28 * (exp(sin(dot(vec2(-0.55, 0.85), p) * 0.47 + t * 0.8)) - 1.0) / 1.718;
    h += 0.09 * (exp(sin(dot(vec2(0.8, 0.6), p) * 0.93 + t * 1.15)) - 1.0) / 1.718;
    h += 0.04 * (exp(sin(dot(vec2(-0.2, 0.98), p) * 1.9 + t * 1.6)) - 1.0) / 1.718;
    return h;
  }

  vec3 place(vec4 s, mat4 M, float wave, float split, float rip, float code, float pr, inout float l, inout vec4 tint) {
    vec3 q = s.xyz;
    if (pr > 0.0) {
      // The footprints: sand, prints pressed one step at a time, and the sea that takes them.
      float kind = floor(s.z / 4.0);
      float f = s.z - kind * 4.0;
      vec2 w = s.xy;
      float edge = 0.03 * sin(w.x * 4.6 + uTime * 0.7) + 0.016 * sin(w.x * 11.0 - uTime * 1.1);
      float fr = uFront + edge, low = uFrontLow + edge;
      // Sun glint on wet sand and water, on a line toward the low sun.
      float glint = exp(-pow((w.x - 0.55 - (w.y - 0.6) * 0.9) * 2.4, 2.0));
      if (kind < 0.5) {
        float under = smoothstep(fr - 0.015, fr + 0.03, w.y);
        float wet = uWet * smoothstep(low - 0.01, low + 0.08, w.y) * (1.0 - under);
        l *= (1.0 + wet * (0.5 + 2.2 * glint)) * (1.0 - 0.45 * under);
        tint = vec4(mix(vec3(0.95, 0.78, 0.62), vec3(0.62, 0.72, 0.84), max(under, wet * 0.5)), 1.0);
      } else if (kind < 1.5) {
        float on = smoothstep(f, f + 0.025, uReveal);
        // A footstep lands bright and settles.
        float fresh = exp(-max(uReveal - f, 0.0) * 40.0) * on;
        float gone = smoothstep(-0.01, 0.07, w.y - low);
        w += vec2(aRand.z - 0.5, aRand.y) * gone * 0.07;
        l *= on * (1.0 - gone) * (1.0 + fresh * 0.9);
        tint = vec4(mix(vec3(1.0, 0.84, 0.66), vec3(1.0, 0.95, 0.88), fresh), 1.0);
      } else {
        float top = ${SAND.y1.toFixed(2)} + 0.25;
        float y = mix(fr, top, f);
        float foam = 1.0 - smoothstep(0.0, 0.05, f);
        if (foam < 0.5) {
          // Fine lines of water, the drawing language of the rest of the page.
          y = floor(y / 0.018 + 0.5) * 0.018;
          w.x += sin(y * 90.0 + uTime * 1.3) * 0.01;
          l *= 0.55 + 0.45 * sin(w.x * 7.0 + y * 40.0 - uTime * 1.6) + glint * 1.4;
          l *= 1.0 - smoothstep(0.5, 1.0, f);
        } else {
          y += sin(w.x * 30.0 + uTime * 2.0 + s.y * 6.0) * 0.006;
          l *= 1.0 + glint;
        }
        w.y = y;
        tint = vec4(mix(vec3(0.62, 0.74, 0.88), vec3(0.95, 0.96, 0.97), foam), 1.0);
      }
      // Fade out past the ends of the beach.
      l *= smoothstep(${SAND.x0.toFixed(2)}, ${(SAND.x0 + 0.9).toFixed(2)}, w.x) * (1.0 - smoothstep(${(SAND.x1 - 0.9).toFixed(2)}, ${SAND.x1.toFixed(2)}, w.x));
      q = vec3(w, 0.0);
    }
    if (wave > 0.0) {
      float h = seaH(q.xz) * wave;
      q.y += h;
      // Crests catch the light, and there's a faint track of it under the horizon.
      l *= 0.24 + 0.9 * smoothstep(-0.02, 0.5, h);
      l += s.w * 0.85 * exp(-pow(q.x / (0.7 + (6.0 - q.z) * 0.075), 2.0)) * smoothstep(0.02, 0.34, h);
      // Dim right under the headline; brightest out toward the middle distance.
      l *= 1.0 - 0.82 * smoothstep(-30.0, -6.0, q.z);
    }
    if (split > 0.0) {
      float a = atan(q.z, q.x);
      float sec = (floor(a / 0.7853982) + 0.5) * 0.7853982;
      q.xz += vec2(cos(sec), sin(sec)) * split * 0.38;
      q.y += split * 0.12 * sin(sec * 3.0 + uTime * 0.8);
      // One slice comes up off the plate.
      float taken = 1.0 - step(0.2, abs(sec - 1.178097));
      q.xz += vec2(cos(sec), sin(sec)) * split * 0.3 * taken;
      q.y += split * 0.3 * taken;
    }
    if (rip > 0.0) {
      // Light running along the strands, and a slow lift through the water.
      float run = sin(q.x * 2.6 + uTime * 1.5 + q.y * 5.0 + q.z * 3.0);
      l *= 0.6 + 0.75 * run * run;
      q.y += 0.018 * sin(q.x * 4.0 + uTime * 1.3 + q.z * 2.0);
    }
    if (code > 0.0) {
      // The code runs: one line lit at a time, like stepping through it.
      float ln = floor(((0.5 - q.y / 1.04) * 960.0 - 24.0) / 60.0);
      float on = 1.0 - step(0.5, abs(ln - mod(floor(uTime * 1.2), ${Shape.CODE_LINES.toFixed(1)})));
      l *= 0.42 + on * 1.1;
    }
    return (M * vec4(q, 1.0)).xyz;
  }

  vec3 flow(vec3 p, float t) {
    return vec3(
      sin(p.y * 1.7 + t) + sin(p.z * 0.9 - t * 0.7),
      sin(p.z * 1.3 + t * 0.8) + sin(p.x * 1.1 + t * 0.5),
      sin(p.x * 1.5 - t * 0.6) + sin(p.y * 0.8 + t));
  }

  void main() {
    ivec2 ij = ivec2(aIdx);
    vec4 sa = texelFetch(tA, ij, 0), sb = texelFetch(tB, ij, 0);
    // Negative brightness marks basil: the one thing on the page that's green.
    float la = abs(sa.w), lb = abs(sb.w);
    float leafA = step(sa.w, 0.0) * uAccA, leafB = step(sb.w, 0.0) * uAccB;
    vec4 tintA = vec4(0.0), tintB = vec4(0.0);
    vec3 pa = place(sa, uMA, uWaveA, uSplitA, uRipA, uCodeA, uPrA, la, tintA);
    vec3 pb = place(sb, uMB, uWaveB, uSplitB, uRipB, uCodeB, uPrB, lb, tintB);

    float st = aRand.w * 0.45;
    float m = smoothstep(st, st + 0.55, uMix);
    vec3 p = mix(pa, pb, m);
    float l = mix(la, lb, m);
    float air = sin(m * 3.14159);
    p += flow(p * 0.42 + aRand.xyz * 2.0, uTime * 0.5) * air * (0.55 + aRand.y * 0.9);

    float acc = mix(uAccA, uAccB, m);

    // A few embers rise off the pizza.
    if (acc > 0.01 && aRand.w > 0.97) {
      float life = fract(aRand.x * 7.0 + uTime * (0.06 + aRand.y * 0.08));
      p.y += life * 3.4 * acc;
      p.x += sin(uTime + aRand.z * 20.0 + life * 7.0) * 0.28 * life * acc;
      l = mix(l, (1.0 - life) * 1.2, acc);
    }

    // Particles shear with the scroll.
    p.y += uVel * (aRand.y - 0.5) * 1.5;

    // Everything gathers out of scattered dust on load.
    if (uIntro < 1.0) {
      float mi = smoothstep(aRand.x * 0.55, aRand.x * 0.55 + 0.45, uIntro);
      vec3 dust = (aRand.xyz - 0.5) * vec3(26.0, 14.0, 12.0);
      p = mix(dust + flow(dust * 0.2, uTime), p, mi);
      l *= 0.2 + 0.8 * mi;
    }

    vec4 mv = viewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float s = depth / ${CAM_Z.toFixed(1)};

    // Pointer: particles part around it and get dragged along.
    vec2 d = mv.xy - uMouse * s;
    float f = exp(-dot(d, d) / (0.34 * s * s));
    mv.xy += normalize(d + 1e-4) * f * 0.16 * s + uMouseV * f * 0.34 * s;
    l += f * 0.45 * l;

    // Click: a single clean ring.
    if (uShock.z >= 0.0) {
      vec2 sd = mv.xy - uShock.xy * s;
      float len = length(sd) + 1e-4;
      float x = len - uShock.z * 6.0 * s;
      float a = exp(-x * x * 4.0 / (s * s)) * exp(-uShock.z * 2.3);
      mv.xy += (sd / len) * a * 0.3 * s;
      l += a * 0.9;
    }

    // Soft focus close to the lens, and a fade to the horizon.
    float coc = abs(depth - ${CAM_Z.toFixed(1)}) * 0.05;
    coc = min(coc, 1.0) * step(depth, 7.0);
    float fog = 1.0 - smoothstep(20.0, 95.0, depth);
    vL = l * fog / (1.0 + coc * coc * 7.0);
    vAcc = acc;
    vLeaf = mix(leafA, leafB, m);
    vTint = mix(tintA, tintB, m);

    gl_PointSize = uPx * (0.82 + aRand.y * 0.5) * (${CAM_Z.toFixed(1)} / depth) * (1.0 + coc * 4.0);
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFrag = /* glsl */ `
  varying float vL, vAcc, vLeaf;
  varying vec4 vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.2, 0.5, d);
    float l = clamp(vL, 0.0, 1.4);
    // Off-white, cooling slightly as it dims; the pizza alone runs ember to cream.
    vec3 cold = mix(vec3(0.5, 0.57, 0.66), vec3(0.93, 0.92, 0.89), smoothstep(0.1, 0.8, l));
    vec3 hot = mix(vec3(0.95, 0.2, 0.04), vec3(1.0, 0.86, 0.68), smoothstep(0.42, 0.95, l));
    vec3 col = mix(mix(cold, hot, vAcc), vec3(0.2, 0.62, 0.24), vLeaf);
    col = mix(col, vTint.rgb, vTint.a);
    gl_FragColor = vec4(col * a * (0.15 + l * 0.72), 1.0);
  }
`;

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const blurFrag = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
    c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
    c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.07;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const compositeFrag = /* glsl */ `
  uniform sampler2D tScene, tBloom;
  uniform float uTime, uVel, uHorizon, uEmber, uMotion, uScrim, uSun, uSunY, uLight;
  varying vec2 vUv;
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  void main() {
    vec2 c = vUv - 0.5;
    // Lens: the frame separates a little at the edges as you scroll fast.
    float sh = (0.0006 + abs(uVel) * 0.012) * uMotion;
    vec2 off = c * sh * (0.6 + dot(c, c) * 4.0);
    vec3 scene = vec3(
      texture2D(tScene, vUv + off).r,
      texture2D(tScene, vUv).g,
      texture2D(tScene, vUv - off).b);
    vec3 bloom = texture2D(tBloom, vUv).rgb;

    vec3 bg = vec3(0.031, 0.035, 0.043);
    // First light along the horizon.
    float hy = vUv.y - 0.5;
    bg += vec3(0.13, 0.16, 0.21) * uHorizon * exp(-hy * hy * (hy > 0.0 ? 34.0 : 240.0));
    // The Dad scene is backlit: a low sun past the runners, and its band along the waterline.
    vec2 sv = (vUv - vec2(0.76, uSunY)) * vec2(1.5, 3.2);
    bg += vec3(0.26, 0.19, 0.14) * uSun * exp(-dot(sv, sv) * 8.0);
    float sy = vUv.y - uSunY;
    bg += vec3(0.1, 0.12, 0.16) * uSun * exp(-sy * sy * (sy > 0.0 ? 26.0 : 500.0));
    // The oven: an ember glow behind the pizza only.
    vec2 e = c - vec2(0.2, 0.02);
    bg += vec3(0.20, 0.05, 0.012) * uEmber * exp(-dot(e, e) * 6.0);

    float scrim = 1.0 - uScrim * 0.82 * (1.0 - smoothstep(0.05, 0.5, vUv.x)) * (1.0 - smoothstep(0.1, 0.5, vUv.y));
    float grain = hash(gl_FragCoord.xy * 0.7 + fract(uTime) * 91.0) - 0.5;

    vec3 col = bg + scene + bloom * 0.42;
    col *= 1.0 - dot(c, c) * 0.5;
    // Keep bright water out from under the text.
    col *= scrim;
    col += grain * 0.018;

    if (uLight > 0.0) {
      // Light: the same light, printed as ink on warm paper. Each particle keeps its hue,
      // darkened, so the sand goes sepia, the basil deep green and the embers rust.
      vec3 ink = scene + bloom * 0.22;
      float lum = dot(ink, vec3(0.3, 0.5, 0.2));
      vec3 hue = ink / max(max(ink.r, max(ink.g, ink.b)), 1e-3);
      vec3 inkCol = mix(vec3(0.07, 0.065, 0.06), hue * 0.36, 0.55);
      float cover = (1.0 - exp(-lum * 2.4)) * scrim;
      // The open sea's nearest rows print as heavy blots; ease them off under the big type.
      cover *= 1.0 - 0.55 * uHorizon * (1.0 - smoothstep(0.05, 0.5, vUv.y));
      vec3 paper = vec3(0.937, 0.914, 0.875);
      // Glows turn into warm washes of colour on the paper.
      paper = mix(paper, vec3(0.86, 0.89, 0.93), 0.5 * uHorizon * exp(-hy * hy * (hy > 0.0 ? 34.0 : 240.0)));
      paper = mix(paper, vec3(1.0, 0.84, 0.66), 0.55 * uSun * exp(-dot(sv, sv) * 8.0));
      paper = mix(paper, vec3(0.98, 0.78, 0.66), 0.6 * uEmber * exp(-dot(e, e) * 6.0));
      paper *= 1.0 - dot(c, c) * 0.14;
      vec3 lit = mix(paper, inkCol, cover) + grain * 0.022;
      col = mix(col, lit, uLight);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class World {
  constructor(canvas, { reduced = false, touch = false } = {}) {
    this.reduced = reduced;
    this.touch = touch;
    this.lowEnd = touch || Math.min(screen.width, screen.height) < 700;
    this.side = this.lowEnd ? 256 : 400; // particles = side²
    this.n = this.side * this.side;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.maxDpr = Math.min(window.devicePixelRatio || 1, this.lowEnd ? 1.5 : 1.75);
    this.dpr = Math.min(this.maxDpr, 1.5);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    this.camera.position.set(0, 0, CAM_Z);

    this.time = 0;
    this.stage = 0;
    this.vel = 0;
    this.intro = reduced ? 1 : 0;
    this.mouse = new THREE.Vector2(99, 99);
    this.mouseS = new THREE.Vector2(99, 99);
    this.mouseV = new THREE.Vector2();
    this.hasPointer = false;
    this.shockAge = -1;
    this.shockPos = new THREE.Vector2();
    this.tex = {};
    this.light = false;
    this.lightT = 0;
    this.resize();
  }

  /* Light theme on or off; eases across unless told to jump. */
  setLight(on, instant) {
    this.light = on;
    if (instant) this.lightT = on ? 1 : 0;
  }

  makeTex(data) {
    const t = new THREE.DataTexture(data, this.side, this.side, THREE.RGBAFormat, THREE.FloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }

  async load() {
    const n = this.n;
    const made = {};
    // One shape per task, so the page keeps moving while they build.
    for (const k of ['dad', 'sea', 'wave', 'pizza', 'code']) {
      await new Promise((r) => setTimeout(r));
      made[k] = k === 'dad' ? prints(n) : Shape[k](n);
    }
    for (const k in made) this.tex[k] = this.makeTex(made[k]);

    const idx = new Float32Array(n * 2), rnd = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      idx[i * 2] = i % this.side;
      idx[i * 2 + 1] = Math.floor(i / this.side);
      for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aIdx', new THREE.BufferAttribute(idx, 2));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));

    this.u = {
      tA: { value: this.tex.sea }, tB: { value: this.tex.dad },
      uMA: { value: new THREE.Matrix4() }, uMB: { value: new THREE.Matrix4() },
      uMix: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1.6 },
      uVel: { value: 0 }, uIntro: { value: this.intro }, uWaveA: { value: 1 }, uWaveB: { value: 0 },
      uSplitA: { value: 0 }, uSplitB: { value: 0 }, uAccA: { value: 0 }, uAccB: { value: 0 },
      uRipA: { value: 0 }, uRipB: { value: 0 }, uCodeA: { value: 0 }, uCodeB: { value: 0 },
      uPrA: { value: 0 }, uPrB: { value: 0 }, uReveal: { value: 0 }, uFront: { value: WATER_REST }, uFrontLow: { value: WATER_REST }, uWet: { value: 0 },
      uMouse: { value: this.mouseS }, uMouseV: { value: this.mouseV }, uShock: { value: new THREE.Vector3(0, 0, -1) },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVert, fragmentShader: particleFrag, uniforms: this.u,
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.buildPost();
    this.resize(true);
    this.ready = true;
  }

  buildPost() {
    const opts = { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.UnsignedByteType };
    this.rtScene = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, opts);
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.Camera();
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: blurFrag, depthTest: false, depthWrite: false,
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: compositeFrag, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.rtScene.texture }, tBloom: { value: this.rtB.texture },
        uTime: { value: 0 }, uVel: { value: 0 }, uHorizon: { value: 1 }, uEmber: { value: 0 }, uScrim: { value: 0 }, uSun: { value: 0 }, uSunY: { value: 0.3 }, uLight: { value: this.lightT },
        uMotion: { value: this.reduced ? 0.2 : 1 },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  resize(force) {
    const w = window.innerWidth, h = window.innerHeight;
    if (!force && this.touch && this._w === w && Math.abs(this._h - h) < 140) return; // mobile URL bar
    this._w = w; this._h = h;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.hH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    this.hW = this.hH * this.camera.aspect;
    this.portrait = this.camera.aspect < 1;
    if (this.rtScene) {
      const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.rtScene.setSize(db.x, db.y);
      const bw = Math.max(2, db.x >> 2), bh = Math.max(2, db.y >> 2);
      this.rtA.setSize(bw, bh);
      this.rtB.setSize(bw, bh);
      this.bloomW = bw; this.bloomH = bh;
      this.u.uPx.value = this.dpr * Math.max(1.25, Math.min(w, h) / 640);
    }
  }

  /* How each shape sits on the current screen. Text is bottom-left on wide
     screens and at the bottom on tall ones, so shapes go right or up. */
  placement(name, m, t) {
    const { hW, hH, portrait: P } = this;
    const live = !this.reduced && this.hasPointer;
    const tx = live ? clamp(this.mouseS.x / hW, -1, 1) : 0, ty = live ? clamp(this.mouseS.y / hH, -1, 1) : 0;
    const pos = new THREE.Vector3(), rot = new THREE.Euler(), scl = new THREE.Vector3(1, 1, 1);
    let spin = 0;
    switch (name) {
      case 'sea':
        return m.identity();
      case 'dad': {
        // The beach from above, tipped away so the sea sits up toward the horizon.
        scl.setScalar(P ? hW * 0.95 : Math.min(hW * 0.62, hH * 1.0));
        pos.set(P ? 0 : hW * 0.1, P ? hH * 0.1 : -hH * 0.12, 0);
        rot.set(-0.62 - ty * 0.05, tx * 0.06, 0);
        break;
      }
      case 'wave': {
        scl.setScalar(P ? 0.55 : Math.min(1.25, hW * 0.27));
        pos.set(P ? 0.5 : hW * 0.26, P ? hH * 0.3 : hH * 0.2, 0);
        rot.set(0.12 - ty * 0.06, -0.86 + tx * 0.12, 0);
        break;
      }
      case 'pizza': {
        scl.setScalar(P ? hW * 0.86 : Math.min(hH * 0.95, hW * 0.37));
        pos.set(P ? 0 : hW * 0.36, P ? hH * 0.28 : hH * 0.06, 0);
        rot.set(0.82 - ty * 0.12, 0, tx * -0.1);
        spin = t * 0.09;
        break;
      }
      case 'code':
        scl.setScalar(P ? hW * 0.95 : Math.min(hW * 0.72, hH * 1.02));
        pos.set(P ? 0 : hW * 0.42, P ? hH * 0.36 : hH * 0.08, 0);
        rot.set(-ty * 0.08, -0.26 + tx * 0.2 + Math.sin(t * 0.25) * 0.05, 0);
        break;
    }
    m.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
    if (spin) m.multiply(new THREE.Matrix4().makeRotationY(spin));
    return m;
  }

  setPointer(nx, ny) {
    this.hasPointer = true;
    this.mouse.set(nx * this.hW, ny * this.hH);
  }

  poke(nx, ny) {
    if (this.reduced || !this.u) return;
    this.shockAge = 0;
    this.shockPos.set(nx * this.hW, ny * this.hH);
  }


  update(dt, stage, vel) {
    if (!this.ready) return;
    this.time += dt * (this.reduced ? 0.25 : 1);
    const t = this.time, u = this.u;
    this.stage = stage;
    this.vel = damp(this.vel, this.reduced ? 0 : clamp(vel, -1, 1), 6, dt);
    u.uTime.value = t;
    u.uVel.value = this.vel * 0.55;

    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 2.6);
    u.uIntro.value = 1 - Math.pow(1 - this.intro, 3);

    const SEQ = ['sea', 'dad', 'wave', 'pizza', 'code', 'sea'];
    const i = Math.min(Math.floor(stage), SEQ.length - 2);
    const raw = clamp(stage - i);
    const k = smooth(0.48, 1, raw);
    const a = SEQ[i], b = SEQ[i + 1];
    u.tA.value = this.tex[a];
    u.tB.value = this.tex[b];
    u.uMix.value = k;
    u.uWaveA.value = a === 'sea' ? 1 : 0;
    u.uWaveB.value = b === 'sea' ? 1 : 0;
    u.uAccA.value = a === 'pizza' ? 1 : 0;
    u.uAccB.value = b === 'pizza' ? 1 : 0;
    u.uSplitA.value = a === 'pizza' ? smooth(0.08, 0.42, raw) : 0;
    u.uSplitB.value = 0;
    u.uRipA.value = a === 'wave' ? 1 : 0;
    u.uRipB.value = b === 'wave' ? 1 : 0;
    u.uCodeA.value = a === 'code' ? 1 : 0;
    u.uCodeB.value = b === 'code' ? 1 : 0;
    u.uPrA.value = a === 'dad' ? 1 : 0;
    u.uPrB.value = b === 'dad' ? 1 : 0;
    // The walk starts each time you arrive: prints for two thirds of the cycle,
    // then the sea comes up over them, and goes back out.
    const here = a === 'dad' || b === 'dad';
    this.printT = here ? (this.printT || 0) + dt * (this.reduced ? 0.5 : 1) : 0;
    const cyc = (this.printT % 13) / 13;
    const rest = WATER_REST + 0.025 * Math.sin(t * 0.9);
    // Far enough to take every print, not so far it floods under the text.
    const deep = -0.62;
    const surge = smooth(0.64, 0.8, cyc);
    u.uReveal.value = cyc / 0.6;
    u.uFrontLow.value = lerp(rest, deep, surge);
    u.uFront.value = lerp(rest, deep, surge * (1 - smooth(0.82, 1, cyc)));
    u.uWet.value = smooth(0.66, 0.72, cyc);

    // Pointer, with the drag it leaves behind.
    if (this.hasPointer) {
      if (this.mouseS.x === 99) this.mouseS.copy(this.mouse);
      const px = this.mouseS.x, py = this.mouseS.y;
      this.mouseS.x = damp(px, this.mouse.x, 9, dt);
      this.mouseS.y = damp(py, this.mouse.y, 9, dt);
      const vx = (this.mouseS.x - px) / Math.max(dt, 0.001), vy = (this.mouseS.y - py) / Math.max(dt, 0.001);
      this.mouseV.x = damp(this.mouseV.x, clamp(vx * 0.12, -1, 1), 7, dt);
      this.mouseV.y = damp(this.mouseV.y, clamp(vy * 0.12, -1, 1), 7, dt);
    }
    this.placement(a, u.uMA.value, t);
    this.placement(b, u.uMB.value, t);

    // A single clean ring on click.
    if (this.shockAge >= 0) {
      this.shockAge += dt;
      if (this.shockAge > 2) this.shockAge = -1;
    }
    u.uShock.value.set(this.shockPos.x, this.shockPos.y, this.shockAge);

    // Atmosphere: only at first light, and at the oven.
    const c = this.compMat.uniforms;
    c.uHorizon.value = Math.max(1 - smooth(0.4, 0.9, stage), smooth(4.5, 5, stage));
    c.uEmber.value = smooth(2.5, 3, stage) * (1 - smooth(3.5, 3.95, stage));
    c.uScrim.value = smooth(0.5, 1, stage) * (1 - smooth(2.5, 2.9, stage));
    c.uSun.value = smooth(0.4, 0.95, stage) * (1 - smooth(1.25, 1.75, stage));
    c.uSunY.value = this.portrait ? 0.74 : 0.78;
    this.lightT = damp(this.lightT, this.light ? 1 : 0, 5, dt);
    c.uLight.value = this.lightT;
    c.uTime.value = t;
    c.uVel.value = this.vel;

    this.render();
    this.adaptQuality();
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);

    // Downsample, blur once each way.
    this.quad.material = this.blurMat;
    const bu = this.blurMat.uniforms;
    bu.tSrc.value = this.rtScene.texture;
    bu.uDir.value.set(1.6 / this.bloomW, 0);
    r.setRenderTarget(this.rtA);
    r.render(this.quadScene, this.quadCam);
    bu.tSrc.value = this.rtA.texture;
    bu.uDir.value.set(0, 1.6 / this.bloomH);
    r.setRenderTarget(this.rtB);
    r.render(this.quadScene, this.quadCam);

    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  /* Trade pixels for frames rather than stutter; sub-8 fps means a throttled tab, not a slow GPU. */
  adaptQuality() {
    const now = performance.now();
    this._qStart = this._qStart || now;
    this._qN = (this._qN || 0) + 1;
    const elapsed = (now - this._qStart) / 1000;
    if (elapsed < 1.2) return;
    const fps = this._qN / elapsed;
    this._qStart = now; this._qN = 0;
    if (document.hidden || fps < 8) return;
    this._qSlow = fps < 45 ? (this._qSlow || 0) + 1 : 0;
    if (this._qSlow >= 2 && this.dpr > 0.8) {
      this.dpr = Math.max(0.8, this.dpr - 0.25);
      this._qSlow = 0;
      this.resize(true);
    }
  }
}

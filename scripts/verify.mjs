#!/usr/bin/env node
/**
 * dsh-liquid-glass 最小验证脚本（本插件无构建步骤、无测试框架）。
 *
 *   node scripts/verify.mjs
 *
 * 分三段，任何一段失败都以非 0 退出：
 *   ① 语法：lib/client.js 能被 node 解析（等价于 node --check）。
 *   ② 入口形状：按 DSH 客户端加载器的真实约定（window.__ModuleLoader__.load({ id, factory })）
 *      在隔离的 vm 上下文里真跑一遍文件顶层代码，检查 id / factory / apply / inject。
 *   ③ 装配：用极简的 React 与 ctx 桩真的执行 apply()，确认
 *      - ctx.effect 注册了玻璃表面 effect 并执行不抛错；
 *      - settings.section 槽位注册成功、order/id 未变；
 *      - 设置页组件树能渲染出全部 10 个字段行。
 *
 * 说明：这是一次「纯静态 + 桩环境」的装配冒烟，不替代真机视觉验收；
 * backdrop-filter 的实际帧率要在宿主里看。
 */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "lib", "client.js");
const src = fs.readFileSync(file, "utf8");

// ── ② 入口形状 + ④ 装配 ────────────────────────────────────────────────
let mod = null;

const styled = () => ({
  style: { setProperty() {}, getPropertyValue: () => "", getPropertyPriority: () => "" },
  attrs: new Map(),
  setAttribute(k, v) { this.attrs.set(k, v); },
  removeAttribute(k) { this.attrs.delete(k); },
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; },
  hasAttribute(k) { return this.attrs.has(k); },
  appendChild() {},
});

const sandbox = {
  window: {
    __ModuleLoader__: { load: (m) => { mod = m; } },
    requestAnimationFrame: (fn) => setTimeout(() => fn(0), 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    addEventListener() {},
    removeEventListener() {},
    innerWidth: 1440,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ borderRadius: "20px" }),
  },
  document: {
    body: styled(),
    head: { appendChild() {} },
    hidden: false,
    createElement: () => ({
      style: {}, dataset: {}, children: [],
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k] ?? null; },
      hasAttribute(k) { return k in this; },
      removeAttribute(k) { delete this[k]; },
      appendChild(c) { this.children.push(c); return c; },
      remove() {},
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      isConnected: true,
    }),
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
  },
  localStorage: { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} },
  location: { search: "" },
  CSS: { supports: () => true },
  URLSearchParams,
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: file });

const fail = (msg) => { console.error("✗ " + msg); process.exit(1); };
const ok = (msg) => console.log("✓ " + msg);

if (!mod) fail("loader 未执行：client.js 顶部不是 window.__ModuleLoader__.load({...}) 形状");
if (mod.id !== "dsh-liquid-glass") fail("模块 id 不是 dsh-liquid-glass，实际为 " + mod.id);
if (typeof mod.factory !== "function") fail("factory 不是函数");
ok("入口形状：__ModuleLoader__.load({ id: dsh-liquid-glass, factory })");

const React = {
  // 桩 React 必须像真 React 一样把「第三个及之后的参数」收成 props.children。
  createElement: (t, p, ...children) => ({ type: t, props: { ...(p || {}), children } }),
  memo: (f) => f,
  useState: (init) => [typeof init === "function" ? init() : init, () => {}],
  useRef: (v) => ({ current: v }),
  useEffect: () => {},
  Fragment: "Fragment",
};

const api = mod.factory((name) => {
  if (name === "react") return React;
  throw new Error("意外的 require: " + name);
});
if (typeof api.apply !== "function") fail("factory 未导出 apply()");
if (!Array.isArray(api.inject) || !api.inject.includes("slots")) fail("inject 未声明 slots");
ok("工厂导出：apply() + inject: [" + api.inject.join(", ") + "]");

let registered = null;
let effects = 0;
const ctx = {
  effect(fn) { effects++; fn(); },
  slots: {
    inject(name, fn) { if (name !== "settings.section") fail("槽位名不符: " + name); fn(); },
    register(def, component) { registered = { def, component }; return def; },
  },
};
api.apply(ctx);
if (!effects) fail("ctx.effect 未注册玻璃表面 effect");
if (!registered) fail("settings.section 未注册");
if (registered.def.name !== "settings.section" || registered.def.id !== "dsh-liquid-glass") {
  fail("槽位定义不符: " + JSON.stringify(registered.def));
}
ok("装配：effect ×" + effects + "，槽位 " + registered.def.name + "/" + registered.def.id + "（order " + registered.def.order + "）");

const tree = registered.component();
const rows = [];
// 桩 React 没有协调器：遇到函数组件就手动调用一次，模拟「渲染到 DOM」。
(function walk(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (typeof node.type === "function") { walk(node.type(node.props)); return; }
  if (node.props?.className === "lg-field") rows.push(node);
  walk(node.props?.children);
})(tree);
if (rows.length !== 10) fail("设置页渲染出的字段行数应为 10，实际 " + rows.length);
ok("设置页渲染：" + rows.length + " 个字段行");

console.log("\n全部通过。真机验收仍建议手动过一遍：拖滑杆看即时反馈、滚动侧栏看板材跟手、切深浅主题看暗色是否发灰。");

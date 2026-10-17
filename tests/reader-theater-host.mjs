/** Minimal DOM that matches the reader mockup host. No browser. */

class ClassList {
  constructor() {
    this.set = new Set();
  }

  add(...names) {
    for (const name of names) {
      if (name) this.set.add(name);
    }
  }

  remove(...names) {
    for (const name of names) this.set.delete(name);
  }

  contains(name) {
    return this.set.has(name);
  }

  toggle(name, force) {
    const on = force === undefined ? !this.set.has(name) : Boolean(force);
    if (on) this.set.add(name);
    else this.set.delete(name);
    return on;
  }
}

class MiniNode {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.classList = new ClassList();
    this.attrs = new Map();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this._hidden = false;
    this._text = "";
    this.isConnected = false;
  }

  get className() {
    return [...this.classList.set].join(" ");
  }

  set className(value) {
    this.classList.set.clear();
    for (const part of String(value).split(/\s+/)) {
      if (part) this.classList.set.add(part);
    }
  }

  get hidden() {
    return this._hidden;
  }

  set hidden(value) {
    this._hidden = Boolean(value);
    if (this._hidden) this.attrs.set("hidden", "");
    else this.attrs.delete("hidden");
  }

  get textContent() {
    const nested = this.children.map((child) => child.textContent ?? "").join("");
    return `${this._text}${nested}`;
  }

  set textContent(value) {
    this._text = value == null ? "" : String(value);
    this.children.length = 0;
  }

  get firstChild() {
    return this.children[0] ?? null;
  }

  setAttribute(name, value) {
    this.attrs.set(name, String(value));
  }

  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }

  removeAttribute(name) {
    this.attrs.delete(name);
  }

  appendChild(node) {
    return this.insertBefore(node, null);
  }

  insertBefore(node, ref) {
    if (node.parentElement) node.parentElement.removeChild(node);
    node.parentElement = this;
    const index = ref ? this.children.indexOf(ref) : this.children.length;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    node._connect(this.isConnected);
    return node;
  }

  removeChild(node) {
    const index = this.children.indexOf(node);
    if (index >= 0) this.children.splice(index, 1);
    node.parentElement = null;
    node._connect(false);
    return node;
  }

  remove() {
    this.parentElement?.removeChild(this);
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentElement;
    }
    return false;
  }

  addEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((item) => item !== fn));
  }

  dispatchEvent(event) {
    for (const fn of [...(this.listeners.get(event.type) ?? [])]) fn(event);
    return true;
  }

  _connect(on) {
    this.isConnected = on;
    for (const child of this.children) child._connect(on);
  }
}

class MiniWindow {
  constructor() {
    this.listeners = new Map();
    this.reduced = false;
    this.document = null;
  }

  addEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((item) => item !== fn));
  }

  dispatchEvent(event) {
    for (const fn of [...(this.listeners.get(event.type) ?? [])]) fn(event);
    return true;
  }

  matchMedia(query) {
    return {
      matches: this.reduced && String(query).includes("prefers-reduced-motion"),
    };
  }

  setTimeout(fn, ms) {
    return setTimeout(fn, ms);
  }

  clearTimeout(id) {
    clearTimeout(id);
  }
}

class MiniDoc {
  constructor(view) {
    this.defaultView = view;
    this.listeners = new Map();
    this.documentElement = new MiniNode(this, "html");
    this.documentElement.isConnected = true;
    this.head = new MiniNode(this, "head");
    this.body = new MiniNode(this, "body");
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    view.document = this;
  }

  createElement(tag) {
    return new MiniNode(this, tag);
  }

  addEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((item) => item !== fn));
  }

  dispatchEvent(event) {
    for (const fn of [...(this.listeners.get(event.type) ?? [])]) fn(event);
    return true;
  }
}

function el(doc, tag, className, attrs) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  }
  return node;
}

export function manualClock() {
  const queue = [];
  return {
    set(fn, ms) {
      const item = { fn, ms };
      queue.push(item);
      return item;
    },
    clear(id) {
      const index = queue.indexOf(id);
      if (index >= 0) queue.splice(index, 1);
    },
    fire() {
      const item = queue.shift();
      if (item) item.fn();
    },
    fireAll() {
      const due = queue.splice(0, queue.length);
      for (const item of due) item.fn();
    },
    get pending() {
      return queue.length;
    },
  };
}

export function dispatch(target, type, extras = {}) {
  const event = {
    type,
    target,
    key: extras.key ?? "",
    metaKey: Boolean(extras.metaKey),
    ctrlKey: Boolean(extras.ctrlKey),
    defaultPrevented: false,
    cancelBubble: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.cancelBubble = true;
    },
  };
  target.dispatchEvent(event);
  return event;
}

/**
 * Fixture host shaped like the mockup window: chrome, content pane, spread, page.
 * @param {{ theme?: "light" | "dark", surface?: "desk" | "phone" }} [options]
 */
export function theaterHost(options = {}) {
  const theme = options.theme === "dark" ? "dark" : "light";
  const surface = options.surface === "phone" ? "phone" : "desk";
  const view = new MiniWindow();
  const doc = new MiniDoc(view);
  const frame = el(doc, "div", `${surface === "phone" ? "ob-phone-screen" : "ob-window"} theme-${theme}`);
  doc.body.appendChild(frame);

  if (surface === "phone") {
    frame.appendChild(el(doc, "div", "ob-island"));
    frame.appendChild(el(doc, "div", "ob-statusbar"));
    frame.appendChild(el(doc, "div", "ob-mhead"));
  } else {
    frame.appendChild(el(doc, "div", "ob-titlebar"));
    frame.appendChild(el(doc, "div", "ob-ribbon"));
    frame.appendChild(el(doc, "div", "ob-viewhead"));
  }

  const stage = el(doc, "div", surface === "phone" ? "ob-mcontent" : "ob-content");
  const pane = el(doc, "div", "atomic-pane");
  const reader = el(doc, "div", "fitness-plugin atomic-reader");
  const bar = el(doc, "div", "atomic-reader-bar");
  const spread = el(doc, "div", "atomic-spread");
  const page = el(
    doc,
    "div",
    surface === "phone" ? "atomic-page" : "atomic-page is-verso",
  );
  page.textContent = "Chapter I";
  const recto = surface === "phone" ? null : el(doc, "div", "atomic-page is-recto");
  if (recto) recto.textContent = "p. 47";
  spread.appendChild(page);
  if (recto) spread.appendChild(recto);

  const gutter = el(doc, "div", "atomic-gutter");
  const remark = el(doc, "button", "atomic-remark");
  remark.textContent = "Remark";
  gutter.appendChild(remark);

  const selbar = el(doc, "div", "atomic-selbar");
  const highlight = el(doc, "button", "atomic-btn", {
    "data-act": "highlight",
    "data-testid": "atomic-reader-highlight",
  });
  highlight.textContent = "Highlight";
  const remarkBtn = el(doc, "button", "atomic-btn", {
    "data-act": "remark",
    "data-testid": "atomic-reader-remark",
  });
  remarkBtn.textContent = "Remark";
  const ask = el(doc, "button", "atomic-btn", {
    "data-act": "ask",
    "data-testid": "atomic-reader-ask",
  });
  ask.textContent = "Ask";
  selbar.appendChild(highlight);
  selbar.appendChild(remarkBtn);
  selbar.appendChild(ask);

  const askSheet = el(doc, "div", surface === "phone" ? "atomic-sheet" : "atomic-ask");
  const size = el(doc, "div", surface === "phone" ? "atomic-phone-size" : "bsize", {
    "data-testid": "atomic-reader-size-sheet",
  });
  for (const letter of ["S", "M", "L", "XL"]) {
    const opt = el(doc, "button", "opt", { "data-act": "book-size", "data-size": letter.toLowerCase() });
    opt.textContent = letter;
    size.appendChild(opt);
  }
  const foot = el(doc, "div", "atomic-reader-foot");
  foot.textContent = "47 / 432";

  if (surface === "phone") page.appendChild(gutter);
  reader.appendChild(bar);
  reader.appendChild(spread);
  if (surface !== "phone") reader.appendChild(gutter);
  reader.appendChild(selbar);
  reader.appendChild(askSheet);
  reader.appendChild(size);
  reader.appendChild(foot);
  pane.appendChild(reader);
  stage.appendChild(pane);
  frame.appendChild(stage);

  if (surface === "phone") {
    frame.appendChild(el(doc, "div", "ob-mnav"));
    frame.appendChild(el(doc, "div", "ob-home"));
  } else {
    frame.appendChild(el(doc, "div", "ob-status"));
  }

  return {
    view,
    doc,
    frame,
    stage,
    page,
    recto,
    bar,
    foot,
    gutter,
    remark,
    selbar,
    highlight,
    remarkBtn,
    ask,
    askSheet,
    size,
  };
}

export function collect(root, pred) {
  const out = [];
  const visit = (node) => {
    if (pred(node)) out.push(node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return out;
}

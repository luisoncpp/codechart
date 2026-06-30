import "@testing-library/jest-dom/vitest";

// React Flow relies on browser APIs jsdom doesn't implement.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver as unknown as typeof global.ResizeObserver;

class DOMMatrixReadOnly {
  m22 = 1;
  constructor() {}
}
global.DOMMatrixReadOnly =
  DOMMatrixReadOnly as unknown as typeof global.DOMMatrixReadOnly;

(global as unknown as { DOMMatrix: unknown }).DOMMatrix = DOMMatrixReadOnly;

Object.defineProperties(global.HTMLElement.prototype, {
  offsetHeight: { get() { return 800; } },
  offsetWidth: { get() { return 800; } },
});

if (!global.HTMLElement.prototype.scrollIntoView) {
  global.HTMLElement.prototype.scrollIntoView = () => {};
}

(global.SVGElement.prototype as unknown as { getBBox: () => object }).getBBox =
  () => ({ x: 0, y: 0, width: 0, height: 0 });

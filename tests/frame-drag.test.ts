import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { startFrameDrag } from "../src/features/graph_canvas/Private/preview_frames/frame-drag";

function setupFrame() {
  document.body.innerHTML = `
    <div data-frame-id="1" style="top: 10px; left: 20px">
      <div class="header"></div>
    </div>`;
  const frameEl = document.querySelector<HTMLElement>("[data-frame-id]")!;
  const header = document.querySelector<HTMLElement>(".header")!;
  return { frameEl, header };
}

function pointerDownEvent(header: HTMLElement, x: number, y: number) {
  return {
    clientX: x,
    clientY: y,
    currentTarget: header,
  } as unknown as React.PointerEvent;
}

/** jsdom has no PointerEvent constructor; listeners only read clientX/Y. */
function firePointer(type: string, x: number, y: number) {
  window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));
}

afterEach(/*releaseAnyActiveDrag*/ () => {
  firePointer("pointerup", 0, 0);
  document.body.innerHTML = "";
});

describe("startFrameDrag", () => {
  it("moves the frame element directly during pointermove without committing", () => {
    const { frameEl, header } = setupFrame();
    const onDrop = vi.fn();
    startFrameDrag(pointerDownEvent(header, 100, 100), { top: 10, left: 20 }, onDrop);

    firePointer("pointermove", 130, 150);
    expect(frameEl.style.top).toBe("60px");
    expect(frameEl.style.left).toBe("50px");
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("commits the final position exactly once on release", () => {
    const { header } = setupFrame();
    const onDrop = vi.fn();
    startFrameDrag(pointerDownEvent(header, 100, 100), { top: 10, left: 20 }, onDrop);

    firePointer("pointermove", 110, 110);
    firePointer("pointermove", 130, 150);
    firePointer("pointerup", 130, 150);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith({ top: 60, left: 50 });
  });

  it("does not commit when the pointer never moved", () => {
    const { header } = setupFrame();
    const onDrop = vi.fn();
    startFrameDrag(pointerDownEvent(header, 100, 100), { top: 10, left: 20 }, onDrop);

    firePointer("pointerup", 100, 100);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("stops tracking after release", () => {
    const { frameEl, header } = setupFrame();
    const onDrop = vi.fn();
    startFrameDrag(pointerDownEvent(header, 100, 100), { top: 10, left: 20 }, onDrop);

    firePointer("pointermove", 130, 150);
    firePointer("pointerup", 130, 150);
    firePointer("pointermove", 500, 500);
    expect(frameEl.style.top).toBe("60px");
    expect(onDrop).toHaveBeenCalledTimes(1);
  });
});

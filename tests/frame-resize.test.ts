import { describe, expect, it } from "vitest";
import { startFrameResize } from "../src/features/graph_canvas/Private/preview_frames/frame-resize";
import {
  MIN_FRAME_HEIGHT,
  MIN_FRAME_WIDTH,
} from "../src/features/graph_canvas/Private/preview_frames/frame-list";

function mountFrame(): { frame: HTMLElement; grip: HTMLElement } {
  document.body.innerHTML = `
    <div class="symbol-widget" data-frame-id="1" style="width: 400px; height: 300px">
      <div class="symbol-widget__body"></div>
      <div class="symbol-widget__resizer"></div>
    </div>`;
  return {
    frame: document.querySelector<HTMLElement>(".symbol-widget")!,
    grip: document.querySelector<HTMLElement>(".symbol-widget__resizer")!,
  };
}

/** The grip's React `onPointerDown` payload: `currentTarget` is the grip. */
function pressGrip(grip: HTMLElement, clientX: number, clientY: number) {
  let defaultPrevented = false;
  startFrameResize({
    currentTarget: grip,
    clientX,
    clientY,
    preventDefault: () => {
      defaultPrevented = true;
    },
  } as unknown as React.PointerEvent);
  return () => defaultPrevented;
}

function movePointer(clientX: number, clientY: number) {
  window.dispatchEvent(Object.assign(new Event("pointermove"), { clientX, clientY }));
}

describe("preview frame corner resize", () => {
  it("writes the dragged size straight to the frame element", () => {
    const { frame, grip } = mountFrame();

    pressGrip(grip, /*clientX=*/ 400, /*clientY=*/ 300);
    movePointer(/*clientX=*/ 460, /*clientY=*/ 340);

    // Based on the content box (400x300), not offsetWidth — no border drift.
    expect(frame.style.width).toBe("460px");
    expect(frame.style.height).toBe("340px");
  });

  it("prevents the press default, so no native drag gesture starts", () => {
    const { grip } = mountFrame();

    // A native resizer/selection gesture is what autoscrolls the body.
    expect(pressGrip(grip, /*clientX=*/ 400, /*clientY=*/ 300)()).toBe(true);
  });

  it("clamps to the CSS minimum size", () => {
    const { frame, grip } = mountFrame();

    pressGrip(grip, /*clientX=*/ 400, /*clientY=*/ 300);
    movePointer(/*clientX=*/ 0, /*clientY=*/ 0);

    expect(frame.style.width).toBe(`${MIN_FRAME_WIDTH}px`);
    expect(frame.style.height).toBe(`${MIN_FRAME_HEIGHT}px`);
  });

  it("stops tracking after release", () => {
    const { frame, grip } = mountFrame();

    pressGrip(grip, /*clientX=*/ 400, /*clientY=*/ 300);
    movePointer(/*clientX=*/ 450, /*clientY=*/ 330);
    window.dispatchEvent(new Event("pointerup"));
    movePointer(/*clientX=*/ 600, /*clientY=*/ 600);

    expect(frame.style.width).toBe("450px");
    expect(frame.style.height).toBe("330px");
  });

  it("ignores a grip outside any frame", () => {
    document.body.innerHTML = `<div class="symbol-widget__resizer"></div>`;
    const orphan = document.querySelector<HTMLElement>(".symbol-widget__resizer")!;

    expect(() => pressGrip(orphan, /*clientX=*/ 0, /*clientY=*/ 0)).not.toThrow();
  });
});

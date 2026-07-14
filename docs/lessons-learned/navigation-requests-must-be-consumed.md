# UI navigation requests must be consumed

A navigation request stored as ordinary state can replay long after its original click. The Review Notes canvas effect depended on both the retained request and a preview callback derived from the reduced graph. Semantic zoom replaced that graph, recreated the callback, and reran the effect, reopening a preview for a completed note. Project reload also preserved the request because the notes store outlived the canvas.

Treat store-backed UI commands as one-shot events: give each request a sequence, consume that sequence before starting async work, reject repeated consumption, and clear pending requests at project lifecycle boundaries. Consuming before the async operation also prevents React Strict Mode from dispatching the same command twice.

# Flexbox on Containers with Inline Markdown Breaks Paragraph Flow

**Date**: 2026-08-20

## What Happens

Applying `display: flex` to a `<p>` or text container that parses inline Markdown (e.g. `renderInlineMarkdown`) causes direct text nodes and inline HTML elements (`<a>`, `<span>`, `<code>`, `<strong>`) to become individual flex items.

By default in CSS Flexbox:
- `flex-direction` defaults to `row`.
- `flex-wrap` defaults to `nowrap`.
- Direct text nodes become anonymous flex items.

When prose contains an inline element (such as a `[[wiki-link]]` rendered as `<a class="hl-wiki-link">...</a>`), the container splits into side-by-side flex columns:
1. The preceding text node forms column 1.
2. The inline element forms column 2.
3. The subsequent text node forms column 3.

Each text node wraps words only within its narrow column width, producing a broken multi-column appearance instead of cohesive paragraph prose.

## Rule

Never set `display: flex` directly on elements whose children are dynamic inline HTML/prose. Let text containers retain `display: block` (the default for `<p>`) so browser inline layout handles word wrapping and inline tags seamlessly.

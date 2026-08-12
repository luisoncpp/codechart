/**
 * Fixture source for preview-frame horizontal-scrollbar repros.
 *
 * DiffCodeLines renders with white-space:pre (inline), so lines longer than the
 * default 680px frame create a horizontal scrollbar on `.symbol-widget__body`.
 *
 * Use: open this file's preview in Codechart, confirm H-scrollbar at left
 * (scrollLeft=0), then drag the frame's bottom-right resize grip.
 *
 * Isolated CSS mirror (no app): tests/fixtures/preview-frame-resize-scroll.html
 */
export const longCppKeywordLine =
  '{ type: "keyword", regex: /^\\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\\b/ },';

export function pad(n: number): number {
  return n;
}

export function pad2(): number { return pad(2); }
export function pad3(): number { return pad(3); }
export function pad4(): number { return pad(4); }
export function pad5(): number { return pad(5); }
export function pad6(): number { return pad(6); }
export function pad7(): number { return pad(7); }
export function pad8(): number { return pad(8); }
export function pad9(): number { return pad(9); }
export function pad10(): number { return pad(10); }
export function pad11(): number { return pad(11); }
export function pad12(): number { return pad(12); }
export function pad13(): number { return pad(13); }
export function pad14(): number { return pad(14); }
export function pad15(): number { return pad(15); }
export function pad16(): number { return pad(16); }
export function pad17(): number { return pad(17); }
export function pad18(): number { return pad(18); }
export function pad19(): number { return pad(19); }
export function pad20(): number { return pad(20); }
export function pad21(): number { return pad(21); }
export function pad22(): number { return pad(22); }
export function pad23(): number { return pad(23); }
export function pad24(): number { return pad(24); }
export function pad25(): number { return pad(25); }

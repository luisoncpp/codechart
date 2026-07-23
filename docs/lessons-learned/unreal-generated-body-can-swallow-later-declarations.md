# Unreal generated-body macros can swallow later declarations

Tree-sitter C++ can interpret `GENERATED_BODY()` followed by `public:` as the
start of a function definition. Comments and reflected fields after that label
can extend the mistaken function until a later `{`, causing multiple valid
top-level Unreal types to become children of an earlier struct.

Mask Unreal `GENERATED_*_BODY()` invocations with equal-length whitespace before
parsing. Preserving byte offsets keeps extraction against the original source
safe while removing the ambiguous token sequence.

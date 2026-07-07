# C++ qualified definitions are not module exports

An out-of-class definition such as `void GameState::BeginPlay()` is a qualified
definition of API owned by the class declaration, usually in a header. Treating
the final identifier as a `.cpp` module export duplicates every method and loses
the qualifier that distinguishes it from a free function.

The C++ adapter should exclude function declarators containing a
`qualified_identifier` while retaining unqualified free-function declarations
and definitions. This also prevents PascalCase methods from reaching frontend
name heuristics that reasonably classify C++ type names as classes.

The graph view still needs implementation nodes to show their class API. Do that
after include resolution by copying exports from a directly included same-stem
header (`Foo.cpp` → `Foo.h`) onto the `.cpp` module's displayed symbols.
Skip forward declarations as exports first, or the copied header API will be
mostly dependency declarations instead of the implemented class.

Unreal's `class MODULE_API Type` form is not understood natively by
tree-sitter-cpp: error recovery can mistake the base class for the declaration
name and expose class members as top-level declarations. Mask the `_API` token
with equal-length whitespace before parsing; preserving byte offsets lets
extraction continue against the original source.

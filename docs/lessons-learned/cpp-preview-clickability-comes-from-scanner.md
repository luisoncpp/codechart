# C++ preview clickability comes from the definition scanner

Preview-frame identifiers become clickable only when their bare token text is
present in `combinedSymbolTargets`. For local and prefetched imported methods,
that target set is fed by `scanFunctionDefinitions`, not by the syntax
highlighter.

When C++ methods are not clickable, check whether the scanner recognizes the
definition shape before tuning token colors or member-access operators. Unreal
style definitions often put qualifiers after the parameter list, for example
`Class::Method(...) const` with the body brace on the next line; those trailing
qualifiers must still count as a definition.

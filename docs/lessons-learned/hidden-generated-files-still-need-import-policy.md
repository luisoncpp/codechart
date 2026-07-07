# Hidden Generated Files Still Need Import Policy

Generated files hidden from analysis can still be referenced by parsed source
files. If the resolver treats those references as ordinary local imports, hiding
the generated file creates false `unresolvedImport` diagnostics.

For Unreal, `hideGeneratedFiles` must be reflected in both file discovery and
C++ include resolution: includes like `*.generated.h` and `*.gen.cpp` are
external metadata when generated files are hidden.

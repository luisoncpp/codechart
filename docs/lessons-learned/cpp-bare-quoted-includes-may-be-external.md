# Bare quoted C++ includes are not necessarily project-relative

C++ `#include "Header.h"` searches the importing file's directory first, then
compiler include paths. In Unreal, those paths include public headers from
declared Engine and plugin module dependencies, which may sit outside the
folder selected for analysis.

Do not normalize every quoted include to `./Header.h`; that turns valid
dependency headers into false unresolved diagnostics. Preserve the written
specifier so resolution can distinguish bare include-path lookups from
explicitly relative `./` and `../` imports. Bare misses are external metadata;
explicit relative misses can still warn.

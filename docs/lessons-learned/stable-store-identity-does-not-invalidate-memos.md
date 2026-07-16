# Stable store identity does not invalidate memoized projections

A store subscription can correctly re-render a component while a nested `useMemo` still returns stale data. Depending only on the store object is insufficient when that object's identity is stable.

When a memo derives UI from an external store, include the store's immutable snapshot or explicit version in the dependency list. Otherwise an unrelated dependency change can appear to fix the UI later and disguise the missing invalidation.

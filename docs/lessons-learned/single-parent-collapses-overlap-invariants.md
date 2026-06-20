# A single `groupId`/`parentId` collapses two of the five §2.2 invariants

When implementing `ProjectGraphBuilder` validation (Phase 1), two of the five
domain invariants turned out to be **structurally impossible to violate** given
the `ProjectGraph` data model:

- **Inv. 2 — "a module belongs to exactly one group":** `ModuleNode.groupId` is a
  single `Option<String>`. A module physically cannot be placed in two groups, so
  there is nothing to reject for the "exactly one" half.
- **Inv. 1 — "containment is a tree, not a DAG":** `GroupNode.parentId` is a single
  `Option<String>`, so a group cannot have two parents — a DAG is unrepresentable.

So the literal invariant names ("reject sibling overlap", "multi-group membership")
have no direct test case from the struct shape alone. The useful thing to enforce
is the **residual teeth** of each:

- Inv. 2 → the referenced `groupId` must *exist* (`MultiGroupMembership`).
- Inv. 1 → every `parentId` must exist **and** the parent chain must be acyclic
  (`SiblingOverlap`). The cycle check is the only real failure mode here.

**Takeaway for future contributors:** before writing a validator, check whether
the data model already encodes the invariant. Spend validation effort on
*referential integrity* (ids point at things that exist) and *acyclicity*, not on
re-checking constraints the type system already guarantees. If a later refactor
lets a module list multiple groups (e.g. for cross-cutting overlays), the literal
overlap check becomes necessary — revisit then.

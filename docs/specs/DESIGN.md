Here is the formal **Technical Design Document (TDD)** compiling the complete vision, architectural rules, and feature set for your code visualization and review platform.

---

# Technical Design Document (TDD): **Trama Vision**

## *Interactive Semantic Graph Environment for Code Review & Documentation*

---

## 1. Executive Summary & Problem Statement

With the advent of AI-driven code generation, the velocity of code production has scaled exponentially, leaving code review processes bottlenecked by 1970s linear, text-based diff tools.

**Trama Vision** is an interactive, GPU-accelerated code visualization framework designed to bridge the cognitive gap in code reviews. By mapping structural Abstract Syntax Trees (AST) onto semantic, nested layouts, it transforms text diffs into structured narrative paths, enabling reviewers to comprehend *architectural intent* at a glance.

---

## 2. Core Entities & Graph Taxonomy

The system models source code as a **Hierarchical Attribute Graph** defined by the following elements:

### 2.1 Modules

* **Definition:** The atomic node of the graph. Represents an individual compilation unit or source file (e.g., a `.tsx` file, or a `.cpp`/`.h` pairing in C++).
* **Properties:** Bound to an AST. Contains local metrics (lines of code, churn, complexity).

### 2.2 Groups

* **Definition:** Nested, non-overlapping bounding containers that partition modules into conceptual layers or sub-systems.
* **Nesting Rules:** Groups can infinitely nest other Sub-Groups or Modules, but sibling groups cannot overlap spatially.
* **Configuration:** Governed by an external configuration file supporting array matching for files, wildcard folder matching, or reference to other defined groups.

### 2.3 Facades (Specialized Modules)

* **Definition:** A specialized designation for a module acting as the public interface for its parent Group.
* **Visual Behavior:** When a Group is colapsed or viewed at a macro zoom level, all external incoming/outgoing connections to any private sub-module within that group are dynamically routed through and rendered on the Facade's border.

### 2.4 Connections (Edges)

The platform distinguishes between two types of structural relationships based on compile-time vs. run-time coupling:

* **Solid Edges (Structural Dependencies):** * *Triggers:* Direct `import`, `#include`, compilation contracts, instantiation (`new`), or implementation of interfaces *within the same group boundary*.
* *Purpose:* Establishes the static, skeletal hierarchy of the application.


* **Dashed Edges / Seams (Dynamic Communication Hooks):**
* *Triggers:* Event emitters/listeners, reactive state contexts (e.g., React Context), cross-group decoupling interfaces, or pub/sub tokens sharing matching identifier strings.
* *Purpose:* Map the dynamic behavioral flow and collateral side effects across decoupled domains.



---

## 3. Functional Requirements & Feature Set

### 3.1 Spatial Architecture & Rule Enforcement

* **Configuration-Driven Grouping:** Ability to parse a JSON/YAML schema mapping system domains to directories, regex strings, or concrete lists.
* **Architectural Drift Detection:** Real-time contract checking. If a module bypasses a designated **Facade** to import a private nested module across Macro-Group boundaries, the system flags the connection automatically as a red, high-contrast alert.

### 3.2 Rich Semantic Inline Documentation

* **Semantic Comments Analysis:** Parsing of targeted inline comment blocks inside code to append metadata to Modules, Groups, and Seams.
```typescript
// @Architecture(Type="Facade", Group="Workspace")
// @DescriptionShort="Coordinates layout canvas metadata and split panels."
// @DescriptionLong="Acts as the single point of entry for the active document canvas state layout..."
// @Icon="layout-split"

```


* **Embedded Documentation Reader:** A dual split-view panel capable of rendering markdown files associated with a Module/Group side-by-side with its structural graph view.

### 3.3 Semantic Zoom & Multi-Level Detail Rendering

* **Level 0 (Bird’s Eye View):** Displays only Macro-Groups and inter-group Facade connections. High-level abstractions mask internal complexity.
* **Level 1 (Architectural View):** Expands focused Groups dynamically to show internal Modules, sub-graphs, and local dependencies.
* **Level 2 (Implementation View):** Deepest semantic zoom. Renders syntax-highlighted code snippets directly inside the node bounding box on the graphical canvas.

### 3.4 Narrative Diff Visualizer (Storytelling Code Review)

* **Diff-Path Tracing:** When loading a Git Pull Request, the system dims unchanged modules and highlights modified elements in high-contrast neon vectors, drawing a directional path of how the change propagates from entry point to side effects.
* **Guided Review Order:** Allows authors to attach metadata to their commits specifying a serialized navigation sequence (e.g., `Step 1: Check Facade signature -> Step 2: See hook execution -> Step 3: View Modal UI update`).
* **Contextual Visual Annotation:** Ability to map standard PR comments onto structural junctions or edge vectors rather than static file lines.

### 3.5 System Analytics & Diagnostics

* **Time-Travel Git Timeline:** A temporal slider allowing reviewers to scrub backwards in Git history, rendering morphing transitions of how Group layouts, Module counts, and Seams evolved over time.
* **Activity Heatmaps Layer:** Superimposes color-gradient telemetry based on repository churn (commit frequency) and bug density, identifying volatile, high-risk components during review.

---

## 4. High-Level System Architecture

The platform pipeline is split into a localized syntactic layer and a cross-reference semantic layer:

```
                  +-----------------------------------+
                  |            Source Code            |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |       Tree-sitter Parser          | (Local AST Syntax)
                  +-----------------------------------+
                                    |
                                    v
+------------------+     +----------------------------+
|  Group Config    |---->|   Global Semantic Engine   | (LSP / Stack-Graphs)
|  (Rules Engine)  |     |  * Resolves references     |
+------------------+     |  * Pairs Emits/Listeners   |
                         |  * Flags Drift/Violations  |
                         +----------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |     Layout Engine (e.g., ELK)    | (Nested Constrained Graphs)
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |  Interactive UI Render Pipeline   | (WebGPU / Canvas Layer)
                  +-----------------------------------+

```

---

## 5. Proposed Technology Stack Options

The main app will run in Tauri.

* **Frontend Interface & Interaction Canvas:** * *Option A (High-Performance Web):* Electron or Tauri shell deploying **React Flow / Svelte Flow** backed by the **ELK (Eclipse Layout Kernel)** engine for deterministic, clean structural layouts.
* *Option B (Native Hardware Bound):* Native desktop shell engineered in **Rust** leveraging **Bevy Engine** or **Slint** using custom WebGPU fragments for instant canvas rendering across millions of nodes.


* **AST Extraction & Reference Resolution:** * **Tree-sitter:** Used natively for fast, incremental parsing of localized token properties and comment block extraction.
* **Stack-Graphs / Language Server Protocol (LSP):** Query engine layer utilized to calculate global symbol resolution across disparate directories, enabling automatic link mapping for abstract solid interfaces and behavioral dashed edges.
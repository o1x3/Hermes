# Product Spec: Hermes

**Version:** 0.4 (Phase 3 Complete)
**Date:** February 6, 2026
**Status:** Phase 1 + Phase 2 + Phase 3 implemented

> *Hermes (Ἑρμῆς) — Greek god of messengers, speed, and communication. The fastest way to talk to your APIs.*

---

## 1. Vision

**Hermes** is a beautiful, modern, cross-platform API client that takes HTTPie's stunning, minimal dark UI and pairs it with Postman's depth of features — without the bloat, forced accounts, or Electron memory hog. Real-time team collaboration via Supabase. Think "Figma meets Postman."

**Core pillars:**

1. **Beautiful UI first** — HTTPie-level polish. Dark mode that looks premium. Generous whitespace. Every pixel intentional.
2. **Power when you need it** — Postman-level features (body types, auth helpers, scripts, folder organization) without the clutter.
3. **Real-time team collaboration** — share collections, see teammates' changes live, simple permissions via Supabase.
4. **Cross-platform** — native-feeling desktop app on macOS, Windows, and Linux via Tauri 2.

---

## 2. UI Design Philosophy

### Inspiration: Best of Both Worlds

**From HTTPie:**
- Clean, dark theme with subtle green/yellow syntax highlighting on near-black background
- Minimal chrome — no visual noise, no unnecessary borders or dividers
- Sidebar that feels lightweight — just collection name + method badges + request names, no icon overload
- JSON response viewer with line numbers, collapsible nodes (▼ arrows), and beautiful syntax colors
- Environment variables as a clean table (name | value columns) with colored variable names
- Top tab bar for multiple open requests — like browser tabs
- Response metadata displayed inline: `HTTP/1.1 200 OK (10 headers)` and `12KB, 522ms, 2h ago`
- The URL bar feels like a search bar — prominent, centered, with the method badge to the left

![HTTPie — sidebar + key-value params editor](local/images/httpie-params-key-value-editor.png)
![HTTPie — JSON response with syntax highlighting](local/images/httpie-json-response-syntax-highlighting.png)
![HTTPie — environment variables table](local/images/httpie-environment-variables-table.png)

**From Postman:**
- Rich body type selector: `none | form-data | x-www-form-urlencoded | raw | binary | GraphQL` with format dropdown (JSON ▾)
- Full tab row for request config: `Docs | Params | Authorization | Headers (9) | Body ● | Scripts | Settings`
- Response section with multiple views: `JSON ▾ | Preview | Visualize`
- Response toolbar: filter, search, copy, wrap icons
- Collection tree with nested folders (▶ expandable) and folder-level organization
- Status bar at bottom with connection state and utility access
- "Save Response" button on response panel
- Badges showing counts: `Headers (9)`, `Variables 2`

![Postman — full UI with tabs, body editor, cURL snippet](local/images/postman-full-ui-tabs-body-curl-snippet.png)
![Postman — collection tree with nested folders](local/images/postman-collection-tree-nested-folders.png)

### Hermes UI Principles

- **Dark mode by default** — rich near-black background (#0D1117), not flat gray. Light mode available but dark is the hero.
- **Syntax highlighting palette** — green for strings, gold for keys, purple for numbers, white for structure (HTTPie-inspired).
- **Method badges are color-coded pills** — green GET, blue POST, amber PUT, red DELETE, purple PATCH, gray OPTIONS/HEAD.
- **Generous whitespace** — let the UI breathe. No cramming. Padding matters.
- **Subtle borders** — very faint dividers (#21262D), never harsh lines.
- **Smooth animations** — sidebar collapse, tab transitions, panel resizing, loading shimmer (Framer Motion).
- **Typography** — monospace for code/JSON (JetBrains Mono or Fira Code), sans-serif for UI labels (Inter).
- **No unnecessary icons** — text labels where possible, icons only where universally understood.

---

## 3. UI Layout (Detailed)

```
┌──────────────────────────────────────────────────────────────────┐
│  ● ● ●  [Hermes]          [tab][tab][tab][+]     [env ▾] [⚙]  │  ← Draggable title bar + request tabs
├─────────────┬────────────────────────────────────────────────────┤
│             │                                                    │
│  COLLECTIONS│  [GET ▾]  {{ base_url }}/api/users         [Send] │  ← URL bar (prominent)
│             │                                                    │
│  ▸ omni-api │────────────────────────────────────────────────────│
│   GET List..│  Params 1 │ Headers │ Auth ⚡│ Body │ Scripts      │  ← Request config tabs
│   GET Regio.│                                                    │
│   GET Regio.│  ┌─────────────────────────────────────────────┐  │
│   GET Produ.│  │  ☑ provider        aws                     │  │  ← Key-value editor
│   GET Attr..│  │    name            value                    │  │
│   POST poss.│  └─────────────────────────────────────────────┘  │
│   GET Servi.│                                                    │
│             │────────────────────────────────────────────────────│
│  ▸ KG API   │                                                    │
│   GET Entit.│  ▸ HTTP/1.1  200 OK  (10 headers)                 │  ← Collapsible response headers
│   GET Docs..│                                                    │
│   POST RAG..│   1 ▼ {                                           │  ← JSON viewer with line numbers
│             │   2     "provider": "aws",                        │
│  ───────────│   3     "results": 252,                           │
│  HISTORY    │   4   ▼ "services": [                             │  ← Collapsible JSON nodes
│  GET /users │   5   ▼   {                                       │
│  POST /login│   6         "Provider": "aws",                    │
│             │   7         "service": "AWSCloudTrail"            │
│             │   8       },                                       │
│             │                                                    │
├─────────────┴────────────────────────────────────────────────────┤
│  JSON ↕     🔍  ⧉  ↓Save             12KB · 522ms · just now   │  ← Response status bar
└──────────────────────────────────────────────────────────────────┘
```

### Key UI Components

**Title Bar + Tabs:**
- Draggable custom title bar (Tauri)
- Request tabs across the top — like browser tabs, each showing method badge + request name
- `[+]` button to open new untitled request
- Environment dropdown (top right) — shows active env name, click to switch
- Settings gear icon (top right)

**Sidebar (Left Panel — collapsible):**
- Collection tree with expand/collapse folders
- Method badges (GET/POST/etc.) next to each request name
- Drag-and-drop reordering
- Right-click context menu: rename, duplicate, delete, move to folder
- Bottom section: History (searchable list of past executions)
- Team collections appear below personal collections with a team icon

![HTTPie — collapsed sidebar with collections](local/images/httpie-collapsed-sidebar-env-variables.png)
![Postman — sidebar with request history](local/images/postman-collection-sidebar-history.png)

**URL Bar:**
- Prominent, wide, feels like a search bar
- Method dropdown on the left (color-coded pill)
- URL input with environment variable autocomplete (`{{var}}` highlights in a distinct color)
- Large [Send] button on the right (accent color)
- Keyboard shortcut: `Ctrl/⌘ + Enter` to send

**Request Config Tabs:**
- `Params` — key-value editor with checkboxes to enable/disable, count badge showing active params
- `Headers` — same key-value editor format
- `Auth` — type selector (None, Bearer, Basic, API Key, OAuth 2.0) with relevant fields

![Postman — params key-value editor with checkboxes](local/images/postman-params-key-value-checkboxes.png)
![Postman — auth tab type dropdown](local/images/postman-auth-tab-type-dropdown.png)
- `Body` — type selector row: `none | form-data | x-www-form-urlencoded | raw | binary | GraphQL`
  - When `raw` selected: format dropdown (JSON, XML, Text, HTML) + CodeMirror editor with syntax highlighting
  - When `GraphQL` selected: query editor + variables panel (split)
  - `Beautify` button to auto-format JSON/XML
- `Scripts` — pre-request and post-response script tabs (future, v2+)

**Response Panel (Bottom or Right split — user configurable):**
- Status line: `HTTP/1.1 200 OK (10 headers)` — collapsible to show raw headers
- JSON body viewer:
  - Line numbers
  - Collapsible nodes with ▼/▸ arrows
  - Syntax highlighting matching the dark theme
  - Search within response (🔍)
  - Copy response button (⧉)
  - Save response to file (↓)
  - Word wrap toggle
- View modes: `JSON` | `Raw` | `Preview` (for HTML) | `Headers` | `Cookies`
- Response metadata bar at bottom: `12KB · 522ms · just now`

![Postman — response panel with JSON, status, headers tabs](local/images/postman-response-json-status-headers-tabs.png)

**Environment Editor (slide-out panel or dedicated tab):**
- Clean table: `Variable Name | Default Value | [Env Name] Value`
- Variable names in accent color
- Add row button at bottom
- Multiple environment columns side by side

![HTTPie — environment variables table with multiple columns](local/images/httpie-environment-variables-table.png)
![HTTPie — environment switcher dropdown](local/images/httpie-environment-switcher-dropdown.png)

---

## 4. Target Users

**Primary:** Solo developers and small backend teams (2–10 people) who are tired of Postman's bloat and want something beautiful that "just works" for team sharing.

**Secondary:** Frontend developers who need to test APIs quickly and want a polished experience without a learning curve.

---

## 5. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Desktop shell** | Tauri 2 | Cross-platform (macOS, Windows, Linux), tiny bundle, Rust backend |
| **Frontend** | React 19 + TypeScript | Large ecosystem, strong typing |
| **UI components** | shadcn/ui + Tailwind CSS v4 | Beautiful defaults, accessible, fully customizable, dark mode built-in, CSS-first config |
| **HTTP engine** | Rust (`reqwest`) via Tauri commands | Full TLS/proxy/cert/redirect control |
| **Local storage** | SQLite (via `rusqlite` bundled) | Fast, file-based, no external DB needed for solo use |
| **Backend / Auth** | Supabase | Auth, Postgres DB, Realtime subscriptions, Row Level Security |
| **Real-time sync** | Supabase Realtime | Broadcast + Postgres Changes for live collaboration |
| **State management** | Zustand | Lightweight, minimal boilerplate |
| **Code editor** | CodeMirror 6 | Request body editor, syntax highlighting, JSON/XML/GraphQL modes |
| **JSON viewer** | Custom React component | Collapsible tree with line numbers, matching HTTPie's look |
| **Animations** | Motion (formerly Framer Motion) | Smooth transitions, panel resizing, loading states |

### Cross-Platform Build Targets

- macOS: `.dmg` (Universal binary — Apple Silicon + Intel)
- Windows: `.msi` + `.exe` (NSIS installer)
- Linux: `.AppImage` + `.deb`

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   React UI                       │
│  (shadcn/ui + Tailwind + Zustand + CodeMirror)  │
├─────────────────────────────────────────────────┤
│                Tauri IPC Bridge                   │
├──────────────────────┬──────────────────────────┤
│   Rust Core          │   Supabase Client (JS)   │
│  ┌────────────────┐  │  ┌─────────────────────┐ │
│  │ reqwest HTTP    │  │  │ Auth (email/GitHub) │ │
│  │ engine          │  │  │ Realtime sync       │ │
│  │                 │  │  │ Postgres REST API   │ │
│  │ SQLite local    │  │  │ Row Level Security  │ │
│  │ storage         │  │  │                     │ │
│  └────────────────┘  │  └─────────────────────┘ │
└──────────────────────┴──────────────────────────┘
```

### Offline-First Design

The app works fully offline for solo use. All requests and collections are stored locally in SQLite. When a user signs in and joins a team, their collections can be synced to Supabase. If the connection drops, changes queue locally and sync when reconnected.

---

## 7. Features by Phase (each phase is manually testable)

---

### Phase 1 — Core Shell + REST Requests (Weeks 1–3) ✅ COMPLETE

**Goal:** Open the app, type a URL, send a GET request, see a beautiful JSON response.

> **Reference:** ![](local/images/httpie-json-response-syntax-highlighting.png)
> *Target look: HTTPie's dark theme, JSON syntax colors, sidebar + response layout.*

**What to build:**
- Tauri 2 + React 19 + Tailwind v4 + shadcn/ui project scaffold
- Custom dark theme (near-black background, HTTPie-inspired color palette, all oklch/hex values)
- App layout: resizable sidebar + main panel (resizable from day 1 via react-resizable-panels v4)
- Sidebar: structured empty state with section labels (Collections, History), collapse button
- URL bar component: method dropdown (all methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) + URL input + Send button
- Native OS title bar used (custom title bar deferred to Phase 3)
- Rust backend: full `send_request` command via Tauri IPC (all methods + headers + body)
  - `send_request(method, url, headers, body)` → `{ status, status_text, headers, body, time_ms, size_bytes }`
- Response panel: status badge (color-coded 2xx/3xx/4xx/5xx) + JSON body viewer with syntax highlighting and line numbers
- Custom JSON viewer: recursive tree renderer, collapse/expand, line numbers, syntax colors
- Response metadata: status code, response time, size
- Keyboard shortcuts: Cmd/Ctrl+Enter to send, Cmd/Ctrl+L to focus URL
- Loading shimmer animation, error states, fade-in on response

**✅ Manual test checklist:**
1. Launch the app — verify dark theme renders correctly on your OS
2. Type `https://jsonplaceholder.typicode.com/posts` in URL bar
3. Click Send (or press `Ctrl/⌘ + Enter`)
4. See JSON response with line numbers and green/gold/purple syntax colors
5. Status badge shows `200 OK` in green
6. Response time and size display correctly (e.g., `245ms · 24.5KB`)
7. Resize the window — verify layout is responsive
8. Collapse/expand JSON nodes work
9. Sidebar shows structured empty state
10. Panels are resizable and sizes persist on reload

---

### Phase 2 — Full Request Builder (Weeks 4–5) ✅ COMPLETE

**Goal:** All HTTP methods, params/headers/body editors, auth tab. Build and send any REST request.

> **Reference:**
> ![](local/images/postman-params-key-value-checkboxes.png)
> *Key-value editor with enable/disable checkboxes per row.*
> ![](local/images/postman-auth-tab-type-dropdown.png)
> *Auth tab with type selector dropdown.*
> ![](local/images/postman-response-json-status-headers-tabs.png)
> *Response panel with status badge, JSON body, headers tabs.*
> ![](local/images/postman-full-ui-tabs-body-curl-snippet.png)
> *Full request builder with body editor, config tabs, cURL snippet.*

**What to build:**
- Method dropdown: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS (color-coded pills)
- Request config tabs: Params, Headers, Auth, Body
- Key-value editor component (reused for params + headers):
  - Checkbox to enable/disable each row
  - Key + value inputs, delete row (×), add row
  - Count badge on tab label (e.g., `Params 3`)
- Body tab:
  - Type selector: `none | form-data | x-www-form-urlencoded | raw | binary`
  - Format dropdown for raw: JSON, XML, Text
  - CodeMirror 6 editor with syntax highlighting + Beautify button
- Auth tab: None, Bearer Token, Basic Auth, API Key
- Response panel upgrades:
  - Collapsible JSON nodes (▼/▸)
  - Copy response, raw view, search within response
  - Response headers tab

**✅ Manual test checklist:**
1. POST `https://jsonplaceholder.typicode.com/posts` with JSON body `{"title":"test","body":"hello"}` → verify `201 Created`
2. PUT with same endpoint — verify method sends correctly
3. Add 3 custom headers — verify count badge shows `Headers 3`
4. Toggle a param checkbox off — verify it's excluded from the URL
5. Set Bearer auth with a fake token — verify `Authorization: Bearer xxx` header is sent
6. Click Beautify on messy JSON — verify it formats correctly
7. Collapse a JSON array node in response — verify toggle works
8. Search for "userId" in response — verify matches highlight

**What was implemented:**
- Shared types extracted to `src/types/request.ts` (HttpMethod, HeaderEntry, ParamEntry, RequestBody, RequestAuth, HttpResponse)
- Zustand store extended with params, bodyConfig, auth state + bidirectional URL-params sync + auth injection + body serialization
- Reusable `KeyValueEditor` component with checkbox toggle, compact inline inputs, auto-add empty row, delete
- `AppShell` refactored with nested vertical `ResizablePanelGroup` (request/response split)
- `RequestConfigTabs` with Params, Headers, Auth, Body tabs + count badges + dot indicators
- `AuthEditor` with None/Bearer/Basic/API Key support, eye toggle for secrets
- `BodyEditor` with type selector (none/form-data/urlencoded/raw/binary), CodeMirror editor (JSON/XML/Text), beautify, KeyValueEditor for form types
- `ResponsePanel` upgraded with Body/Headers tabs, toolbar (copy/raw-toggle/search)
- `JsonViewer` search highlighting with match count
- `HeadersViewer` for response headers table
- `ResponseToolbar` with copy (check feedback), view mode toggle, search input
- Dependencies: `@uiw/react-codemirror`, `@codemirror/lang-json`, `@codemirror/lang-xml`, `@codemirror/lang-html`, `@codemirror/theme-one-dark`
- shadcn components: tabs, checkbox, separator, label, select
- 10 new files, 7 modified files, 0 Rust changes

---

### Phase 3 — Collections + Local Storage (Weeks 6–8) ✅ COMPLETE

**Goal:** Save requests into collections with folders. Persists in SQLite. Close and reopen = everything is there.

> **Reference:**
> ![](local/images/postman-collection-tree-nested-folders.png)
> *Collection tree with nested folders and overview.*
> ![](local/images/httpie-params-key-value-editor.png)
> *HTTPie sidebar with method badges + request names — target feel for our sidebar.*

**What to build:**
- SQLite database (via `tauri-plugin-sql`)
- Sidebar: collection tree with folders, method badges, expand/collapse
- Create collection, create folder, save request to collection/folder
- Click sidebar item → loads request into builder
- Drag-and-drop reordering
- Right-click context menu: rename, duplicate, delete, move
- Request tabs (browser-style): open multiple, switch, close, new tab (+)
- Unsaved changes dot indicator on tabs
- Auto-save (debounced)
- Collection-level default headers and auth (inherited)

**✅ Manual test checklist:**
1. Create collection "My API" — verify it appears in sidebar
2. Create folder "Users" inside it
3. Save GET `/users` into the folder — verify method badge + name in sidebar
4. Save POST `/users` with body — verify second item appears
5. Click between them — verify builder loads the correct request
6. Open both in tabs — verify tab switching works
7. Close the app, reopen — verify all collections/folders/requests persist
8. Drag a request to a different folder — verify it moves
9. Right-click → Duplicate — verify a copy appears
10. Right-click → Delete — verify it's removed with confirmation
11. Set collection-level Bearer auth — verify a child request inherits it

**What was implemented:**

Architecture choices:
- **rusqlite (bundled)** instead of `tauri-plugin-sql` — direct rusqlite with `bundled` feature compiles SQLite from source (no system dependency). All SQL lives in Rust, never in TypeScript. Trade-off: more Rust boilerplate (~13 IPC commands), but type-safe, testable, clean IPC boundary.
- **shadcn Sidebar component** replaced the `react-resizable-panels` horizontal split for the sidebar. Lost drag-to-resize sidebar width; gained built-in collapse animation, rail, keyboard shortcut (Cmd+B), mobile sheet drawer, and icon-only collapsed mode.
- **Flat arrays + derived tree** — collectionStore holds flat arrays of collections/folders/requests. Tree structure is computed at render time via `buildTree()`. Simpler state management, no normalized entity store needed.
- **Tab-per-request model** — tabStore holds array of tabs, each with independent request state. Dirty detection via JSON comparison against a saved snapshot. Tabs can exist for both saved and unsaved requests.
- **Auto-save with 2s debounce** — only fires for tabs already linked to a saved request. Unsaved tabs require explicit Cmd+S → SaveRequestDialog.
- **Auth inheritance resolved at send time** — chain: request auth → folder defaultAuth → collection defaultAuth. First non-"none" wins. UI shows "Inheriting X auth from [name]" with click-to-override.
- **@dnd-kit** for drag-and-drop request reordering. Pointer sensor with 5px activation distance to avoid accidental drags on click.

Rust backend (src-tauri/):
- `src/db/mod.rs` — AppDb(Mutex<Connection>) managed state, init_db(), WAL + foreign keys pragmas, v1 migration (3 tables)
- `src/db/collections.rs` — Collection struct, CRUD (get_all, create, get_by_id, update, delete)
- `src/db/folders.rs` — Folder struct, CRUD with parent_folder_id for nesting
- `src/db/requests.rs` — SavedRequest struct, CRUD + duplicate + move_request
- `src/commands.rs` — 14 IPC commands: send_request, load_workspace, 4 collection ops, 3 folder ops, 5 request ops, reorder_items
- `src/lib.rs` — DB init in setup hook, all commands registered
- Dependencies: rusqlite 0.31 (bundled), uuid 1 (v4)

Frontend types & utils (src/):
- `types/collection.ts` — Collection, Folder, SavedRequest, Workspace, TreeNode types
- `lib/request-utils.ts` — extracted parseQueryParams, buildUrlWithParams, serializeBody, injectAuth from old requestStore
- `lib/workspace-utils.ts` — parseWorkspace/parseCollection/parseFolder/parseRequest for Rust JSON↔TS bridge, serialize helpers
- `lib/tree-utils.ts` — buildTree() converts flat arrays to recursive TreeNode[]

Stores:
- `stores/collectionStore.ts` — Zustand store: flat collections/folders/requests arrays, all CRUD via invoke(), lookup helpers
- `stores/tabStore.ts` — Zustand store: tabs array, activeTabId, per-tab TabRequestState, dirty detection, sendRequest with auth resolver callback
- `stores/requestStore.ts` — DELETED (replaced by tabStore + request-utils)

Layout:
- `components/layout/AppShell.tsx` — SidebarProvider + SidebarInset + vertical ResizablePanelGroup
- `components/layout/Sidebar.tsx` — shadcn Sidebar with SidebarHeader/Content/Group/Rail, CollectionTree, new collection button
- `components/layout/RequestTabs.tsx` — browser-style tab bar with method dots, dirty indicators, middle-click close, + button

Collections:
- `components/collections/CollectionTree.tsx` — recursive tree from flat arrays, CollectionNode/FolderNode/RequestSubNode with context menus and DnD
- `components/collections/TreeContextMenu.tsx` — ContextMenu wrapper with AlertDialog for delete confirmation, action factories per node type
- `components/collections/CreateCollectionDialog.tsx` — name input dialog
- `components/collections/SaveRequestDialog.tsx` — name + collection/folder picker
- `components/collections/MoveRequestDialog.tsx` — target collection/folder picker
- `components/collections/RenameInput.tsx` — inline rename with Enter/Escape/blur
- `components/collections/DraggableTree.tsx` — DndContext/SortableContext/SortableItem wrappers

Hooks:
- `hooks/useAutoSave.ts` — 2s debounce auto-save for dirty saved tabs
- `hooks/useKeyboard.ts` — extended with Cmd+S, Cmd+T, Cmd+W, Cmd+Shift+[/]

Auth inheritance:
- `components/request/AuthEditor.tsx` — added inheritedAuth prop, shows "Inheriting X auth from [name] · Click to override"
- `components/request/RequestConfigTabs.tsx` — passes inheritedAuth through to AuthEditor

shadcn components added: sidebar, collapsible, context-menu, dialog, alert-dialog, sheet, skeleton
Dependencies added: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

Files: 15 new, 10 modified, 1 deleted. All pass: cargo check, tsc, vite build, vitest.

---

### Phase 4 — Environments + Variables (Weeks 9–10)

**Goal:** Multiple environments with variables. Switch from top bar. Variables resolve everywhere.

> **Reference:**
> ![](local/images/httpie-environment-variables-table.png)
> *HTTPie env editor — clean table with Defaults + named env columns.*
> ![](local/images/httpie-environment-switcher-dropdown.png)
> *HTTPie env switcher dropdown in top bar.*
> ![](local/images/postman-workspace-overview-variables.png)
> *Postman workspace variables panel for comparison.*

**What to build:**
- Environment data model in SQLite
- Environment editor panel: table with Variable Name | Default | Env1 | Env2
- Environment switcher dropdown in top bar
- Variable resolution engine:
  - Syntax: `{{variable_name}}`
  - Resolves in: URL, params, headers, body, auth fields
  - `{{...}}` highlighted in distinct color in URL bar and editors
  - Autocomplete on typing `{{`
- Variable scopes (priority): Request > Folder > Collection > Environment > Global
- Undefined variable behavior: `{{undefined_var}}` renders as literal text (not empty string), shown with a red/warning highlight to signal it's unresolved. Tooltip on hover: "Variable not found in current scope."
- Secret variables (masked as •••, never exported)

**✅ Manual test checklist:**
1. Create env "Dev" with `base_url = http://localhost:3000`
2. Create env "Prod" with `base_url = https://api.example.com`
3. Type `{{base_url}}/users` in URL bar — verify `{{base_url}}` is highlighted
4. Select "Dev" in dropdown — Send — verify request goes to localhost
5. Switch to "Prod" — Send — verify request goes to api.example.com
6. Type `{{` in a header value — verify autocomplete dropdown shows variables
7. Set a collection-level variable — verify it resolves in child requests
8. Mark a variable as secret — verify it shows as ••• in the editor
9. Create a request-level override — verify it takes priority over env variable

---

### Phase 5 — Request History + Import/Export (Weeks 11–12)

**Goal:** Every request execution is logged. Import from Postman. Export Hermes collections.

> **Reference:** ![](local/images/postman-collection-sidebar-history.png)
> *Postman sidebar showing request history with URLs.*

**What to build:**
- Request history (SQLite, local-only):
  - Log every Send: full request + response + timestamp
  - History panel in sidebar below collections
  - Search + filter by method, status, URL, date range
  - Click entry → view full request/response
  - "Restore" button → loads into builder
  - Auto-cleanup: configurable retention (default 30 days)
- Import: Postman v2.1 JSON, cURL paste, OpenAPI/Swagger (basic)
- Export: Hermes JSON, export single request as cURL
- Settings panel: theme toggle, history retention, timeout, proxy, SSL toggle

**✅ Manual test checklist:**
1. Send 5 different requests across different methods
2. Open History — verify all 5 listed with method, URL, status, time
3. Search for a URL fragment — verify filtering works
4. Click a history entry — verify full request + response display
5. Click "Restore" — verify request loads into builder with all fields
6. Export a Postman collection from Postman → Import into Hermes → verify structure matches
7. Copy a complex cURL command → paste into Hermes → verify it populates method, URL, headers, body
8. Export a Hermes collection → delete it → re-import → verify round-trip is lossless
9. Change history retention to 7 days in settings → verify old entries are cleaned up

---

### Phase 6 — Supabase Auth + Teams (Weeks 13–15)

**Goal:** Sign up, create a team, invite members, share collections with real-time sync.

> **Reference:**
> ![](local/images/postman-invite-share-modal.png)
> *Postman invite/share modal.*
> ![](local/images/postman-create-workspace-dropdown.png)
> *Postman workspace creation dropdown.*

**What to build:**
- Supabase project setup (auth, DB, realtime, RLS)
- Auth: email+password, GitHub OAuth, magic link
- User profile: username, display name, avatar
- Sign-in is optional (app works fully without it)
- Teams: create, invite by username/email, owner/member roles
- Cloud collections: "Share to team" copies to Supabase
- Team collections in sidebar under team name
- Real-time: Supabase Realtime subscriptions on team data
- Offline queue + sync on reconnect
- Conflict resolution strategy: **last-write-wins** using `updated_at` timestamps (UTC, server-authoritative). Rationale: API collections are rarely co-edited on the same field simultaneously, and LWW is simple to reason about. If a conflict is detected (local `updated_at` < server `updated_at` for the same record), the server version wins and the local change is discarded with a toast notification: "Your change to [item] was overwritten by [username]'s edit." Future consideration: field-level merging or operational transforms if user feedback demands it.
- Status bar indicator: Offline / Syncing... / Synced

**✅ Manual test checklist:**
1. Sign up with email — verify account creates, profile appears
2. Sign in with GitHub — verify OAuth redirects correctly
3. Create team "Backend Squad" — verify it appears in sidebar
4. Invite a second user by username — verify invitation works
5. Second user sees and accepts — verify they appear in members list
6. Share a personal collection to the team — verify both users see it
7. User A edits a request name — verify User B sees the change within 2 seconds
8. User A adds a new request — verify it appears in User B's sidebar live
9. Disconnect User B's network — make changes — reconnect — verify changes sync
10. Owner removes a member — verify they lose access immediately
11. Use the app without signing in — verify all local features work perfectly
12. Sign in on a fresh install — verify cloud collections load into sidebar

---

### Phase 7 — GraphQL + WebSocket (Weeks 16–18)

**Goal:** First-class GraphQL and WebSocket support alongside REST.

> **Reference:**
> ![](local/images/postman-graphql-query-editor-response.png)
> *Postman GraphQL editor — split query/variables panel + response.*
> ![](local/images/postman-websocket-message-composer.png)
> *Postman WebSocket UI — message composer, JSON body, Connect button, saved messages.*

**What to build:**
- GraphQL:
  - GraphQL option in body type selector
  - Split editor: Query (left) + Variables (right)
  - Schema introspection + autocomplete via [`cm6-graphql`](https://github.com/graphql/graphiql/tree/main/packages/cm6-graphql) CodeMirror extension (provides syntax highlighting, linting, autocomplete, and introspection out of the box — no custom parser needed)
  - Response handles `data` + `errors` shape
- WebSocket:
  - WS request type (alongside GET/POST/etc.)
  - Connection URL + Connect/Disconnect button
  - Message composer + Send
  - Message stream: scrollable, sent (→) and received (←) with timestamps
  - Connection status indicator (green dot)
  - Auto-reconnect option

**✅ Manual test checklist:**
1. Set URL to `https://countries.trevorblades.com/graphql`, select GraphQL body type
2. Write `{ countries { name code } }` — verify syntax highlighting
3. Click "Introspect" — verify schema loads and autocomplete activates
4. Send query — verify response shows country data
5. Add a variables panel input — verify it's sent with the query
6. Switch to WS type — connect to `wss://echo.websocket.events`
7. Send "hello" — verify echo comes back
8. Verify message stream shows → hello and ← hello with timestamps
9. Click Disconnect — verify status changes, Connect button re-appears
10. Enable auto-reconnect — kill connection — verify it reconnects

---

### Phase 8 — Polish + Command Palette + Launch (Weeks 19–20)

**Goal:** Final polish, keyboard shortcuts, onboarding, cross-platform builds.

**What to build:**
- Command palette (⌘K / Ctrl+K): fuzzy search across requests, collections, history, environments, settings
- Keyboard shortcuts:
  - `⌘/Ctrl + Enter` — Send request
  - `⌘/Ctrl + N` — New request
  - `⌘/Ctrl + S` — Save request
  - `⌘/Ctrl + E` — Toggle environment panel
  - `⌘/Ctrl + K` — Command palette
  - `⌘/Ctrl + ,` — Settings
  - `⌘/Ctrl + L` — Focus URL bar
  - `⌘/Ctrl + W` — Close current tab
- Onboarding: welcome screen with sample collection + tooltips
- Cross-platform QA
- Auto-updater (Tauri built-in)
- CI/CD: GitHub Actions → macOS + Windows + Linux builds
- Performance targets: < 2s cold start, < 15MB bundle, < 100MB idle RAM

**✅ Manual test checklist:**
1. Press ⌘K — search for a request by name — Enter to open — verify it loads
2. Test every keyboard shortcut listed above
3. First launch — verify onboarding/welcome screen appears
4. Install fresh on macOS — verify all features work
5. Install fresh on Windows — verify all features work
6. Install fresh on Linux — verify all features work
7. Time cold start — must be < 2 seconds
8. Check bundle size — must be < 15MB
9. Check idle memory — must be < 100MB
10. Trigger auto-update check — verify update dialog appears

---

## 8. Supabase Data Model

### Tables

**profiles**
```sql
create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
```

**teams**
```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);
```

**team_members**
```sql
create table team_members (
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);
```

**collections**
```sql
create table collections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  description text,
  variables jsonb default '{}',
  auth jsonb default '{}',
  sort_order int default 0,
  created_by uuid references profiles(id),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
```

**folders**
```sql
create table folders (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete cascade,
  parent_folder_id uuid references folders(id) on delete cascade,
  name text not null,
  variables jsonb default '{}',
  auth jsonb default '{}',
  sort_order int default 0,
  created_at timestamptz default now()
);
```

**requests**
```sql
create table requests (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  method text not null default 'GET',
  url text not null default '',
  headers jsonb default '[]',
  params jsonb default '[]',
  body jsonb default '{}',
  auth jsonb default '{}',
  sort_order int default 0,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
```

**environments**
```sql
create table environments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  variables jsonb default '[]',
  created_at timestamptz default now()
);
```

### Row Level Security (RLS)

```sql
-- Collections visible to team members only
create policy "Team members can view collections"
  on collections for select
  using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

create policy "Team members can insert collections"
  on collections for insert
  with check (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- Similar policies on all tables
-- Owner-only actions (delete team, manage members) check role = 'owner'
```

### JSONB Shape Validation

The `headers`, `params`, `body`, `auth`, and `variables` columns use `jsonb` for flexibility, but their shapes must be validated at the **application layer** (not DB) using TypeScript types and Zod schemas. Canonical shapes:

```typescript
// headers & params: array of key-value pairs with enable toggle
type KeyValueEntry = { key: string; value: string; enabled: boolean };

// body: discriminated union by type
type RequestBody =
  | { type: 'none' }
  | { type: 'raw'; format: 'json' | 'xml' | 'text' | 'html'; content: string }
  | { type: 'form-data'; entries: KeyValueEntry[] }
  | { type: 'x-www-form-urlencoded'; entries: KeyValueEntry[] }
  | { type: 'binary'; filePath: string }
  | { type: 'graphql'; query: string; variables: string };

// auth: discriminated union by type
type RequestAuth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' };

// variables (environments & scopes): array with optional secret flag
type Variable = { key: string; value: string; secret?: boolean };
```

Zod schemas derived from these types validate on read (from DB) and write (before persist). Invalid shapes log a warning and fall back to defaults rather than crashing.

### Realtime

Enable Supabase Realtime on `collections`, `folders`, `requests`, and `environments`. Frontend subscribes filtered by `team_id`, updates Zustand store on insert/update/delete.

---

## 9. Local Storage Schema (SQLite)

```sql
-- Collections, folders, requests, environments: same structure as Supabase

-- Sync queue for offline changes
create table sync_queue (
  id integer primary key autoincrement,
  table_name text not null,
  record_id text not null,
  action text check (action in ('insert', 'update', 'delete')),
  payload json,
  created_at text default (datetime('now'))
);

-- History is local-only (never synced to cloud)
create table request_history (
  id integer primary key autoincrement,
  request_id text,
  collection_name text,
  method text,
  url text,
  request_headers json,
  request_body text,
  response_status int,
  response_headers json,
  response_body text,
  response_time_ms int,
  response_size_bytes int,
  executed_at text default (datetime('now'))
);
```

---

## 10. Project Structure

```
hermes/
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── http/
│   │   │   ├── client.rs       # reqwest request execution
│   │   │   ├── ws.rs           # WebSocket handler
│   │   │   └── proxy.rs        # Proxy config
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── collections.rs
│   │   │   ├── history.rs
│   │   │   └── sync.rs
│   │   └── commands.rs         # Tauri IPC commands
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # React frontend
│   ├── components/
│   │   ├── ui/                 # shadcn/ui (button, input, dropdown, dialog, tabs, etc.)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TitleBar.tsx
│   │   │   ├── RequestTabs.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── request/
│   │   │   ├── RequestBuilder.tsx
│   │   │   ├── UrlBar.tsx
│   │   │   ├── MethodBadge.tsx
│   │   │   ├── KeyValueEditor.tsx
│   │   │   ├── BodyEditor.tsx
│   │   │   ├── AuthEditor.tsx
│   │   │   └── GraphQLEditor.tsx
│   │   ├── response/
│   │   │   ├── ResponsePanel.tsx
│   │   │   ├── JsonViewer.tsx
│   │   │   ├── HeadersViewer.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ResponseToolbar.tsx
│   │   ├── collections/
│   │   │   ├── CollectionTree.tsx
│   │   │   ├── FolderNode.tsx
│   │   │   ├── RequestNode.tsx
│   │   │   └── CollectionActions.tsx
│   │   ├── environments/
│   │   │   ├── EnvSwitcher.tsx
│   │   │   └── EnvEditor.tsx
│   │   ├── teams/
│   │   │   ├── AuthModal.tsx
│   │   │   ├── TeamSwitcher.tsx
│   │   │   ├── InviteModal.tsx
│   │   │   └── MembersList.tsx
│   │   ├── history/
│   │   │   └── HistoryPanel.tsx
│   │   ├── websocket/
│   │   │   ├── WsPanel.tsx
│   │   │   └── MessageStream.tsx
│   │   └── common/
│   │       ├── CommandPalette.tsx
│   │       ├── ThemeProvider.tsx
│   │       └── LoadingShimmer.tsx
│   ├── stores/
│   │   ├── requestStore.ts
│   │   ├── collectionStore.ts
│   │   ├── environmentStore.ts
│   │   ├── teamStore.ts
│   │   ├── historyStore.ts
│   │   └── uiStore.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── sync.ts
│   │   ├── variables.ts
│   │   ├── import-export.ts
│   │   └── theme.ts
│   ├── hooks/
│   │   ├── useRequest.ts
│   │   ├── useRealtime.ts
│   │   ├── useKeyboard.ts
│   │   └── useVariables.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tailwind.config.js
└── README.md
```

---

## 11. Color Palette

```
Background:         #0D1117  (near-black)
Surface:            #161B22  (sidebar, panels, cards)
Border:             #21262D  (subtle dividers)
Text Primary:       #E6EDF3  (white-ish)
Text Secondary:     #8B949E  (muted gray)
Text Muted:         #484F58  (disabled)

Accent:             #2563EB  (blue-600, Send button, links)
Accent Hover:       #1D4ED8  (blue-700)

Method GET:         #22C55E  (green-500)
Method POST:        #3B82F6  (blue-500)
Method PUT:         #F59E0B  (amber-500)
Method PATCH:       #A855F7  (purple-500)
Method DELETE:      #EF4444  (red-500)
Method OPTIONS:     #6B7280  (gray-500)
Method HEAD:        #6B7280  (gray-500)

Status 2xx:         #22C55E  (green)
Status 3xx:         #F59E0B  (amber)
Status 4xx:         #EF4444  (red)
Status 5xx:         #EF4444  (red)

JSON Key:           #F0C674  (warm gold)
JSON String:        #22C55E  (green)
JSON Number:        #A855F7  (purple)
JSON Boolean:       #3B82F6  (blue)
JSON Null:          #6B7280  (gray)
JSON Bracket:       #8B949E  (muted)

Variable Highlight: #F59E0B  (amber, for {{variables}} in URL/editors)
```

---

## 12. Future Considerations (Post v1)

Out of scope for v1, but architect with these in mind:

- Pre/post request scripting (JavaScript sandbox)
- Test assertions (status code checks, JSON path validation)
- Collection runner (execute all requests in sequence)
- Mock servers
- API documentation generation from collections
- CI/CD CLI companion
- Organization hierarchy (orgs → teams → projects)
- Granular permissions (viewer / editor / admin)
- Response diffing (compare two history entries)
- Billing / monetization (Pro tier)
- Plugin system

---

## 13. Success Metrics

- Cold start < 2 seconds on all platforms
- Bundle size < 15MB
- Idle memory < 100MB
- First request sent within 60 seconds of install
- Team sharing set up within 5 minutes of sign-up
- "This looks amazing" as the first reaction from testers
- Successful import of 50+ request Postman collection without errors

# xvm-view Registration Timing Backward-Compatibility Investigation

## 1. Executive summary

`xvm-view` is implemented in `src/XVM/XVMView.ts`, and before this fix `XVM` tried to register `XVMViewPack` during `XVM.onLoad()`. That registration was not a stable public capability. It was hidden behind an async dynamic import inside `XVM.onLoad()`, while `XVMClient.bootstrap()` could render a cached boot view before server hydration.

The expected `XUIRuntime.loadApp(...)` path usually waits for `XVM.onLoad()`, so it should normally register `xvm-view` before `XVMClient.bootstrap()`. The fragile cases are:

- `XVM` was already added to `_x` but is still loading, because `_x.loadModuleAsync(XVM)` returns immediately when the module already exists in `_x._modules`.
- A caller uses fire-and-forget `_x.loadModule(XVM)` or manually uses `XVMClient`.
- `XUIRuntime.loadApp(...)` is called with `_runtime._load_xvm: false`, even though the `XVMClient` path still renders through the imported `XVM` singleton.
- A downstream app tries to self-register `XVMViewPack`, but the package root only exports it as a type, not as a runtime value.

The fix can be kept entirely inside `@xpell/ui`: make XVM view support an idempotent runtime registration path, export the relevant runtime values from the package root, and call the registration path before any cached boot render. The implemented shape follows that path with `registerXVMViewSupport()`, root runtime exports, and a guard at the start of `XVMClient.bootstrap()`.

## 2. Current registration flow

Source files traced:

- `src/XUI/XUIRuntime.ts`
- `src/XVM/XVM.ts`
- `src/XVM/XVMClient.ts`
- `src/XVM/XVMView.ts`
- `src/index.ts`
- `package.json`
- `dist/types/index.d.ts`

Pre-fix `XUIRuntime.loadApp(...)` flow:

1. `XUIRuntime.loadApp(opts)` validates `opts._app_id` and `opts._wormhole_url`.
2. It calls `await XUIRuntime.loadModules(opts._runtime)`.
3. `loadModules(...)` calls `await _x.loadModuleAsync(XUI)`.
4. It then loads `XDBClientModule`, optional auth/entity/studio/XAI/project-memory modules, and, when `_load_xvm` is not false, calls `await _x.loadModuleAsync(XVM)`.
5. After module loading, `loadApp(...)` imports caller-provided `_object_packs`.
6. It constructs `new XVMClient(...)`.
7. It stores the client and calls `await client.bootstrap()`.

Core loader behavior:

- `_x.loadModuleAsync(module)` only awaits `module.load()` if `_x.addModule(module)` returns true.
- `addModule(...)` returns false when a module with the same `_name` is already present.
- `XModule.load()` awaits `onLoad()`, but a second `loadModuleAsync(XVM)` call does not wait for an already-present, still-loading module.

Pre-fix `XVM` registration behavior:

- `src/XVM/XVM.ts` has private flags `_xvm_view_pack_loaded` and `_xvm_view_resolver_bound`.
- `XVM.onLoad()` calls `await this.registerXVMViewSupport()`.
- `registerXVMViewSupport()` dynamically imports `./XVMView`.
- It then calls `XUI.importObjectPack(XVMViewPack)`.
- It binds an `xvm:view-resolver-ready` listener that calls `XVMView.setViewResolver(...)`.
- It marks `_xvm_view_pack_loaded = true`.

Pre-fix `XVMClient` cached boot behavior:

1. `XVMClient` constructor sets app/env XData keys and fires `xvm:view-resolver-ready` with `resolver: (view_id) => this.get_view(view_id)`.
2. `bootstrap()` calls `_bind_events()`.
3. `bootstrap()` immediately calls `_render_cached_boot_view()`.
4. `_render_cached_boot_view()` reads:
   - `xvm:last_app:<env>:<app_id>`
   - `xvm:version:<env>:<app_id>`
   - `xvm:view:<env>:<app_id>:<entry_view_id>`
5. It only hydrates the cached entry view into `_views_cache`.
6. It calls `render_view(cached_entry)`.
7. `render_view(...)` calls `_mount_runtime_app()` if the app is not mounted.
8. `_mount_runtime_app()` calls `XVM.app(runtime_app)`.
9. `XVM.loadApp(...)` registers raw views, initializes routes, then navigates to the start view.
10. Navigation eventually calls `XUI.create(raw_view)`.
11. If the cached entry view contains a child `{ _type: "xvm-view" }`, `XUI.create(...)` must already have an object class for `"xvm-view"` in the XUI object registry.

If `XVMViewPack` is registered in time, a missing referenced view is not fatal. `XVMView.resolveView()` asks the resolver for `_view_id`; if the referenced view is not yet in `_views_cache`, it logs debug output, binds `xvm:view-cache-updated`, and retries when server hydration later fetches the referenced view. The fatal failure is earlier: `"Xpell object 'xvm-view' not found in module 'xui'"`, which means the object pack was not registered before `XUI.create(...)`.

## 3. Root cause

There are two related root causes.

First, registration is tied to `XVM.onLoad()`, not to the cached render boundary that needs it. `XUIRuntime.loadApp(...)` generally loads `XVM` before constructing `XVMClient`, but the core loader does not await an already-present module that is still loading. That leaves a timing hole when another caller has already added `XVM` through a non-awaited or concurrent path.

Second, downstream apps cannot reliably close the gap themselves. `src/index.ts` currently has:

```ts
export type { XVMView, XVMViewData, XVMViewPack, XVMViewResolver } from "./XVM/XVMView";
```

Pre-fix, `dist/types/index.d.ts` preserved those as type-only exports, and the built CJS/ESM root export list did not export `XVMView` or `XVMViewPack` as runtime values. `package.json` only exposes the package root, `./xui.css`, and `./package.json`; private subpaths such as `@xpell/ui/dist/...` or `@xpell/ui/src/...` are not public package API and should not be required for app code.

## 4. Backward-compatible fix options

### Option A: Static import in `XVM.ts`

Replace the dynamic `await import("./XVMView")` with a static import of `XVMView` and `XVMViewPack`, then register synchronously in `XVM.onLoad()`.

Pros:

- Removes the dynamic import delay.
- Keeps behavior internal to XVM.
- Low risk for apps that load XVM normally.

Cons:

- Still depends on `XVM.onLoad()` running before cached boot render.
- Does not fully protect manual `XVMClient` usage or already-present/still-loading `XVM`.
- Does not give downstream apps a public registration escape hatch.

### Option B: Public idempotent helper

Add a small public helper such as `registerXVMViewSupport(...)` that imports/registers `XVMViewPack`, binds the resolver event once, and optionally sets a resolver directly.

Pros:

- Centralizes duplicate-safe registration.
- Can be called from `XVM.onLoad()`, `XUIRuntime.loadApp(...)`, and `XVMClient.bootstrap()`.
- Provides a public, non-private-subpath API for advanced/manual apps.
- Keeps persisted JSON unchanged.

Cons:

- Adds a small public API surface.
- Needs root export and type declaration updates.

### Option C: `XUIRuntime.loadApp(...)` ensures support before client construction

Call the idempotent helper after `loadModules(...)` and before `new XVMClient(...)`.

Pros:

- Covers the preferred high-level app API.
- Keeps downstream apps using `XUIRuntime.loadApp(...)` unchanged.

Cons:

- Does not protect direct/manual `new XVMClient(...).bootstrap()` usage unless `XVMClient` also ensures support.
- If the resolver is only provided by the constructor event, this still relies on event listener timing.

### Option D: `XVMClient.bootstrap()` ensures support before cached render

Call the idempotent helper at the start of `bootstrap()`, before `_render_cached_boot_view()`, and pass/set `resolver: (view_id) => this.get_view(view_id)` directly.

Pros:

- Places the guard exactly at the failure boundary.
- Covers `XUIRuntime.loadApp(...)` and manual `XVMClient` usage.
- Ensures both object-pack registration and resolver availability before cached rendering.

Cons:

- `XVMClient` gains a direct dependency on XVM view support, but that is already semantically true because persisted XVM views may contain `xvm-view`.

### Option E: Root runtime exports only

Change `src/index.ts` to runtime-export `XVMView` and `XVMViewPack`.

Pros:

- Fixes the public API gap.
- Lets advanced apps self-register with `XUI.importObjectPack(XVMViewPack)`.

Cons:

- Does not fix existing apps automatically.
- Does not guarantee cached boot render safety for apps that do not add explicit registration.

## 5. Recommended fix

Use Options B, C, D, and E together, with Option D as the critical runtime guard.

Implemented/recommended implementation shape:

1. Add an idempotent browser-runtime helper near the XVM view implementation:

```ts
registerXVMViewSupport(opts?: {
  resolver?: XVMViewResolver | null;
}): void
```

2. The helper should:
   - Call `XUI.importObjectPack(XVMViewPack)`.
   - Set `XVMView.setViewResolver(opts.resolver)` when a resolver is provided.
   - Bind the `xvm:view-resolver-ready` event once for compatibility with the existing event flow.
   - Be safe when called many times.

3. Update `XVM.onLoad()` to call the helper instead of owning a private dynamic import path.

4. Update `XUIRuntime.loadApp(...)` to ensure support after loading modules and before constructing `XVMClient`.

5. Update `XVMClient.bootstrap()` to ensure support before `_render_cached_boot_view()`, passing its own resolver directly.

6. Update `src/index.ts` to export runtime values:

```ts
export { XVMView, XVMViewPack, registerXVMViewSupport } from "./XVM/XVMView";
export type { XVMViewData, XVMViewResolver } from "./XVM/XVMView";
```

If the helper lives in a separate file, export it from that file instead.

This preserves the existing JSON shape, cache keys, manual object-pack behavior, XVM behavior, and `XUIRuntime.loadApp(...)` options. Duplicate registration is harmless at the object-manager level because registering an object class assigns the same `_type` key, but the resolver event listener should still be explicitly guarded to avoid duplicate listeners.

## 6. Files expected to change

Expected source changes:

- `src/XVM/XVMView.ts` or a new adjacent `src/XVM/XVMViewSupport.ts`
  - Add the idempotent helper.
  - Keep `XVMView`, `XVMViewPack`, and resolver types data/browser-only.
- `src/XVM/XVM.ts`
  - Replace private dynamic registration with the shared helper.
- `src/XVM/XVMClient.ts`
  - Call the helper at the beginning of `bootstrap()` before `_render_cached_boot_view()`.
  - Pass/set the client resolver directly.
- `src/XUI/XUIRuntime.ts`
  - Ensure XVM view support before `new XVMClient(...)`.
- `src/index.ts`
  - Runtime-export `XVMView`, `XVMViewPack`, and the helper.
  - Keep `XVMViewData` and `XVMViewResolver` as type exports.
- `dist/types/*` and bundled `dist/*`
  - Generated by the package build.

Expected test changes:

- `tests/xuiobject-dom-projection.test.mjs`
  - Add focused regression coverage for cached boot with `xvm-view`.
  - Update the current assertion that `"XVMView" in ui` is false if runtime root exports are added.
- Potentially add a small package export test if the existing test file becomes too broad.

## 7. Tests to add/update

Focused tests:

1. `XUIRuntime.loadApp(...)` cached boot with `xvm-view`
   - Seed `XDB` with cached app metadata and cached entry view containing `{ _type: "xvm-view", _view_id: "toolbar" }`.
   - Start `XUIRuntime.loadApp(...)` or directly exercise `XVMClient._render_cached_boot_view()` with the same setup.
   - Assert no `"Xpell object 'xvm-view' not found in module 'xui'"` error before server hydration.

2. No console/runtime error before server hydration
   - Temporarily capture `console.error` and thrown errors during cached render.
   - Ensure the cached entry view can mount even when the referenced view is not yet hydrated.

3. Referenced view resolves after views are loaded
   - After cached entry render, add/fetch the referenced view into `_views_cache`.
   - Fire or trigger `xvm:view-cache-updated`.
   - Assert the `xvm-view` instance resolves and renders referenced children.

4. App without `xvm-view` still boots
   - Use a cached entry view with only basic XUI objects.
   - Assert behavior remains unchanged.

5. Duplicate registration is harmless
   - Call `registerXVMViewSupport()` multiple times.
   - Call `XUI.importObjectPack(XVMViewPack)` manually as an existing app might.
   - Assert `XUI.create({ _type: "xvm-view", ... })` still creates an `XVMView`.
   - Assert only one resolver listener path is active if listener count can be inspected, or assert no duplicate side effects.

6. Package root exports
   - Assert `XVMView`, `XVMViewPack`, and `registerXVMViewSupport` are runtime values from `@xpell/ui` / local root import.
   - Keep `XVMViewResolver` as a type-only export.

7. Manual `XVMClient` usage
   - Construct `new XVMClient(...)` after `XUI` is available and call the cached render path without separately loading `XVM.onLoad()`.
   - Assert `xvm-view` is registered before cached render.

## 8. Risks

- A new public helper must not create hidden persistence, mutate app JSON, or alter cache keys.
- The helper should stay browser-runtime scoped and avoid Node APIs.
- Resolver registration must avoid duplicate event listeners.
- Directly setting the resolver from `XVMClient.bootstrap()` changes timing from event-only to deterministic direct assignment. This is intentional, but tests should cover manual and existing event-driven paths.
- Static exports may increase bundle surface slightly, but `xvm-view` is already part of the XVM runtime and currently present in the built bundle as a dynamic chunk.
- If future apps intentionally omit XVM support while using `XVMClient`, the helper makes `xvm-view` available but does not otherwise change their view JSON or navigation behavior.

## 9. Migration impact for downstream apps such as ReutMusicPlayer

ReutMusicPlayer should not need app-level changes after this fix if it uses `XUIRuntime.loadApp(...)` or `XVMClient.bootstrap()`. The app should not import private `@xpell/ui/src/...` or `@xpell/ui/dist/...` paths, should not inline referenced views, and should not change persisted `vibe-system` JSON.

Advanced downstream apps that manually compose modules can optionally call the public helper, but that should be an escape hatch rather than a requirement for normal `XUIRuntime.loadApp(...)` usage.

## Concise answers

Can this be fixed entirely inside `@xpell/ui`?

Yes. The failure is in client-side object-pack availability and public export surface. No server persistence or ReutMusicPlayer-specific logic is required.

Does ReutMusicPlayer need app-level changes after this fix?

No. Existing persisted views using `_type: "xvm-view"` should keep working as-is once `@xpell/ui` guarantees registration before cached boot render.

What is the smallest safe implementation step?

Add an idempotent `registerXVMViewSupport()` helper, export it and the `XVMView`/`XVMViewPack` runtime values from the package root, and call the helper at the start of `XVMClient.bootstrap()` before `_render_cached_boot_view()`. Keeping the existing `XVM.onLoad()` path as another caller of the same helper preserves manual XVM behavior.

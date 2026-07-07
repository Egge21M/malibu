# project

2026-07-07, whole-project Radix UI to Base UI migration, final verification passed.

## Changed

components.json now uses `base-nova`; `bunx --bun shadcn@latest info --json` reports `base: "base"`.

package.json and bun.lock add `@base-ui/react@1.6.0` and remove `radix-ui` after all Radix imports were migrated.

App code was swept for consumer-side Radix props: `asChild`, `position=`, `decorative`, and `activationMode`. The only required app-code changes were `Button render={<NavLink />}` and the Select `onValueChange` null guard.

The remaining installed wrappers, `alert`, `card`, `input`, and `textarea`, did not import Radix primitives and were intentionally left unchanged.

## Left alone

No non-Radix third-party wrappers such as cmdk, vaul, sonner, input-otp, react-day-picker, or recharts were present in `src/mainview/components/ui`.

## Behavior changes

Button and Badge polymorphism uses `render` instead of `asChild`.

Base UI Tabs default to manual activation on keyboard focus; no `activateOnFocus` compatibility patch was added.

Base UI Select callbacks can receive `null`; the mint picker ignores `null` to preserve its existing required string state.

## Verification

Baseline before migration passed: `bun run typecheck` and `bun run build`.

Final verification passed: `bun run typecheck`, `bun run build`, and `rg -n "radix-ui|@radix-ui|from \"radix-ui\"|Slot" package.json bun.lock components.json src/mainview` returned no matches.

0 wrappers remain on Radix.

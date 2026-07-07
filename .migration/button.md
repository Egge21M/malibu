# button

2026-07-07, golden pair via CLI, migrated from Radix Slot to Base UI Button.

## Changed

src/mainview/components/ui/button.tsx:1 now imports the real `@base-ui/react/button` primitive and removes the Radix `Slot`/`asChild` wrapper shape. The leftover scan is clean: `grep -n "radix-ui\|@radix-ui" src/mainview/components/ui/button.tsx` returns no matches.

src/mainview/App.tsx:1174 updates the only `Button asChild` consumer to Base UI's `render={<NavLink to="/activity" />}` prop, preserving the link-style button behavior while removing the button-only `type` prop.

components.json:4 flips the shadcn style from `radix-nova` to `base-nova` for whole-project migration. package.json and bun.lock add `@base-ui/react` alongside Radix as required before the final dependency cleanup.

## Left alone

Other UI wrappers still on Radix were intentionally left for their own component commits.

## Behavior changes

The polymorphic API is now `render` instead of `asChild` for Button consumers.

## Verify by hand

Open the overview screen and click the "View all" button in Recent movement. Confirm it navigates to `/activity`, keeps the outline styling, and remains keyboard-focusable.

# tabs

2026-07-07, golden pair via CLI, migrated from Radix Tabs to Base UI Tabs.

## Changed

src/mainview/components/ui/tabs.tsx:1 now imports `@base-ui/react/tabs`. `TabsTrigger` renders `TabsPrimitive.Tab`, and `TabsContent` renders `TabsPrimitive.Panel`, matching Base UI part names. The leftover scan is clean: `grep -n "radix-ui\|@radix-ui" src/mainview/components/ui/tabs.tsx` returns no matches.

src/mainview/App.tsx uses Tabs at the send and receive forms, but no consumer-side prop changes were required because there were no `activationMode` or `asChild` usages.

## Left alone

No app consumers were changed; their `defaultValue`, `value`, and className props remain compatible.

## Behavior changes

Base UI Tabs default to manual activation on keyboard focus. Radix defaulted to automatic activation. This is flagged as a behavior delta and was not silently patched with `activateOnFocus`.

## Verify by hand

Open the send and receive forms. Click between Ecash and Lightning tabs, then use arrow keys on the tab list and confirm focus movement and activation behavior are acceptable.

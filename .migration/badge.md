# badge

2026-07-07, golden pair via CLI, migrated from Radix Slot to Base UI render utilities.

## Changed

src/mainview/components/ui/badge.tsx:1 now uses `@base-ui/react/use-render` and `@base-ui/react/merge-props` instead of Radix `Slot`. The public polymorphic prop is now `render`. The leftover scan is clean: `grep -n "radix-ui\|@radix-ui" src/mainview/components/ui/badge.tsx` returns no matches.

## Left alone

No Badge consumers needed changes; none used the old `asChild` prop.

## Behavior changes

The polymorphic API is now `render` instead of `asChild` for Badge consumers.

## Verify by hand

Open screens that show status/count badges, including Recent movement and operation lists. Confirm badges keep their sizing, colors, and focus ring when rendered as interactive elements.

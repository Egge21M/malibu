# separator

2026-07-07, golden pair via CLI, migrated from Radix Separator to Base UI Separator.

## Changed

src/mainview/components/ui/separator.tsx:1 now imports `@base-ui/react/separator` and renders the callable Base UI primitive. The wrapper no longer accepts Radix's `decorative` prop. The leftover scan is clean: `grep -n "radix-ui\|@radix-ui" src/mainview/components/ui/separator.tsx` returns no matches.

## Left alone

No Separator consumers needed changes; no `decorative` prop usage was found in `src/mainview`.

## Behavior changes

Base UI separators are semantic separators. There were no decorative call sites to convert to plain visual rules.

## Verify by hand

Open screens with divided sections and confirm horizontal and vertical separators still render at the expected size and do not disrupt keyboard navigation.

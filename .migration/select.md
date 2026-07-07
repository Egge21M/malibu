# select

2026-07-07, golden pair via CLI, migrated from Radix Select to Base UI Select.

## Changed

src/mainview/components/ui/select.tsx:2 now imports `@base-ui/react/select`. The content wrapper now uses the Base UI `Portal > Positioner > Popup > List` anatomy, `SelectLabel` maps to `GroupLabel`, scroll buttons map to scroll arrows, and icons use Base UI's `render` prop. The leftover scan is clean: `grep -n "radix-ui\|@radix-ui" src/mainview/components/ui/select.tsx` returns no matches.

src/mainview/App.tsx:1996 updates the MintPicker `onValueChange` handler for Base UI's widened `string | null` callback value, preserving the existing non-null mint URL state model.

## Left alone

No `position="popper"` Select consumers were found, so no call sites needed conversion to `alignItemWithTrigger={false}`.

## Behavior changes

Base UI Select callbacks include event details and can provide `null` when no value is selected. Current app usage ignores `null` for the mint picker to preserve the existing required string behavior.

## Verify by hand

Open each mint picker. Use mouse and keyboard to open the popup, move through options, select a mint, and verify the selected mint URL updates without clearing to an empty value.

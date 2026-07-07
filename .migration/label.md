# label

2026-07-07, golden pair via CLI, migrated from Radix Label to a native label wrapper.

## Changed

src/mainview/components/ui/label.tsx:5 now renders a native `<label>` typed with `React.ComponentProps<"label">` and removes the Radix Label primitive import. The leftover scan is clean: `grep -n "radix-ui\|@radix-ui" src/mainview/components/ui/label.tsx` returns no matches.

## Left alone

No Label consumers needed changes; they already use native label props.

## Behavior changes

None expected for current usage. Base UI has no Label primitive, so the wrapper now relies on native label semantics.

## Verify by hand

Click each form label in the send, receive, mint, and settings forms. Confirm focus moves to the associated input/select where an `htmlFor` relationship exists.

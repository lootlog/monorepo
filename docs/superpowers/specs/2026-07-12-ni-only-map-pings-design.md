# NI-only map pings

## Scope

Map pings are available only in Margonem's new interface (NI). The old interface
(SI) must neither expose ping settings nor send, receive, render, or play sounds
for map pings.

## Client behavior

- Hide the map ping enabled toggle on SI.
- Hide the ping sound controls on SI.
- Hide the map ping action from the hotkey settings on SI.
- Reject local ping triggers and ignore received ping events on SI.
- Keep stored account preferences and hotkey bindings unchanged so they become
  available again when the same account is used on NI.

The runtime guard belongs in `useMapPings`, which is the shared boundary for
local and remote ping behavior. Settings components independently filter their
controls using the existing `Game.interface` discriminator.

## Verification

- Settings component tests verify that all three controls are hidden on SI and
  remain visible on NI.
- Map ping hook tests verify that SI cannot send a ping and ignores received
  ping events even when the stored preference is enabled.
- Existing NI map ping tests continue to pass.

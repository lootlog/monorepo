# Install the Lootlog extension

The extension displays Lootlog inside Margonem without Tampermonkey. The userscript remains available as a separate installation method.

## Test builds

Local builds connect to `http://localhost`; sign in there before testing. Production builds use the production Lootlog services and are stored separately in `.output/production/`.

### Chrome and Edge

1. Extract the extension archive.
2. Open `chrome://extensions` or `edge://extensions` and enable developer mode.
3. Choose **Load unpacked** and select the directory containing `manifest.json`.
4. Sign in to the matching Lootlog website with Discord and reload the game.

### Firefox

1. Extract the extension archive.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select the archive's `manifest.json`.
4. Sign in to the matching Lootlog website with Discord and reload the game.

Firefox removes temporary extensions when the browser closes. These steps are for testing; store installation will be available after publication. The extension requires Chromium 116 or Firefox 140 or later.

On macOS, press **Command + Shift + G** in the file picker to enter the build directory, including the hidden `.output` directory.

## Use the extension

When you are signed out, a draggable login window appears in the center of the game. Open the Lootlog website from that window, sign in, then return and check the session again. A failed session check displays an error and can be retried. You can close the window until the next game reload. The extension's toolbar icon also opens Lootlog.

Changing character or world reloads the game and reconnects the extension. Overlay settings stay in their existing storage. If both installation methods are enabled, the extension takes precedence over the userscript.

To return to the userscript, disable the extension in the browser settings and reload the game. Removing the extension does not sign you out of the Lootlog website.

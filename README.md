# Waypoints for Claude

A lightweight browser extension for Chrome, Brave, Edge, other Chromium browsers and Firefox that makes long conversations on [claude.ai](https://claude.ai) easy to find your way around.

- **Message rail:** a slim strip on the right edge with one mark per message you sent. Click a mark to jump straight to that message. Hover the strip to see a list of all your messages, with the time you sent each one.
- **Send times, recorded automatically:** every message you send is stored with its date and time.
- **Saved messages:** bookmark any of your messages, in any chat, and add a note. Clicking a saved message jumps to it, or opens its chat in a new tab and jumps there.
- **History:** everything you've sent, across all chats, grouped by day and searchable.
- **Keyboard shortcuts:** move between your messages without scrolling. You can change them.

It runs only on claude.ai, uses no libraries, and does its work only when the page changes.

**Works in:** Chrome, Edge, Brave and other Chromium browsers (version 121 or later), and Firefox for desktop (version 140 or later).

## Installation

### Chrome, Brave, Edge

1. Download this repository (**Code → Download ZIP**) and unzip it into a folder you'll keep.
2. Open `chrome://extensions` (or `brave://extensions` or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder.
5. Reload any open claude.ai tabs.
6. Optional: pin the icon (puzzle piece → pin). Clicking it opens or closes the panel.

Chrome may show a small warning about an unrecognized `browser_specific_settings` key. That part of the manifest is for Firefox, and Chrome ignores it.

### Firefox (personal use)

Firefox only keeps extensions that Mozilla has signed. Signing is free, automatic and private: the extension isn't published anywhere.

**One-time setup**

1. Make the zip. In a terminal, inside the repository folder:

    ```bash
    rm -f ../waypoints-for-claude.zip && zip -r ../waypoints-for-claude.zip manifest.json background.js content.js icons
    ```

    This creates `waypoints-for-claude.zip` next to the folder. (On Windows, select those four items, not the folder itself, then right-click → **Send to → Compressed (zipped) folder**. `manifest.json` must be at the top of the zip.)

2. Go to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/) and sign in with a free Mozilla account.
3. Click **Submit a New Add-on**, choose **On your own**, and upload the zip. If you're asked about source code, answer **No**: the code isn't minified or bundled.
4. When signing finishes (usually a few minutes), download the signed `.xpi` file.
5. Drag the `.xpi` onto a Firefox window, or open `about:addons` → gear icon → **Install Add-on From File**, and accept the prompt. It asks for access to claude.ai; allow it.
6. Reload any open claude.ai tabs.
7. Optional: pin the icon (puzzle piece → gear next to Waypoints → **Pin to Toolbar**).

**Updating**

1. Increase `version` in `manifest.json` (for example `1.1.0` → `1.1.1`). Mozilla doesn't accept the same version twice.
2. Make the zip again (step 1 above).
3. In the Developer Hub: **My Add-ons → Waypoints for Claude → Upload New Version**.
4. Install the new `.xpi` the same way. Your times, saved messages and settings are kept.

**Quick test without signing**

Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** and pick `manifest.json`. It stays until Firefox closes.

## Using it

**The rail.** The marks on the right edge are your messages, top to bottom. The highlighted one is where you are, and saved messages show in the accent color. Click a mark to jump there.

**The message list.** Hover the rail to open a list of your messages, with day headers and send times. Click one to jump to it, or click its bookmark to save it. The pin keeps the list open.

**Hovering a message.** When you hover one of your messages in the chat, a small label shows when you sent it, with a button to save it.

**The panel.** Open it with the icon at the top of the rail, the toolbar icon, or a shortcut. It has four tabs:

| Tab       | What's there                                              |
| --------- | --------------------------------------------------------- |
| This chat | Your messages in this chat, with times and search         |
| Saved     | Your saved messages from all chats, with notes and search |
| History   | Everything you've sent, grouped by day, with search       |
| Settings  | Display options, shortcuts, backup and delete             |

**Shortcuts**

| Keys (default)        | Does                               |
| --------------------- | ---------------------------------- |
| `Alt` + `↑` / `↓`     | Previous / next of your messages   |
| `Alt` + `Shift` + `S` | Save or unsave the current message |
| `Alt` + `Shift` + `P` | Open or close the panel            |
| `Esc`                 | Close the panel                    |

On a Mac, `Alt` is the `⌥ Option` key.

To change a shortcut, open **Settings → Shortcuts**, click it and press the new keys. A shortcut needs `Alt` or `Ctrl` (on a Mac `⌥`, `⌃` or `⌘`). `Esc` cancels and `Backspace` removes the shortcut. **Reset shortcuts** brings back the defaults.

Shortcuts work only on claude.ai, where they take priority over Claude's and the browser's own. They use the physical key, so they work with any keyboard layout. `AltGr` never triggers a shortcut, so typing `@`, `#` or `€` is safe. Some keys, like `Ctrl+T`, belong to the browser and can't be used.

## How send times work

When you press Enter in the message box, or click a send button, and your new message appears, Waypoints stores the time you sent it. Edits count too: the edited message gets the time you saved the edit.

Messages sent before you installed Waypoints, or from another device or browser, have no time. Browsing old chats or switching between edited versions of a message never records a time.

## Your data

Everything is stored in this browser's extension storage. Nothing is sent anywhere, and claude.ai itself can't read it. Firefox shows this at install as "no data collected".

For each message you send, Waypoints stores the chat ID, a short fingerprint of the text, the first 300 characters, and the time. Saved messages keep up to 600 characters plus your note.

Settings → **Export backup** saves everything to a file, and **Import backup** merges a file back in, for example on another computer or in another browser.

**Private windows.** Waypoints never runs in private or incognito windows, so nothing from a private session is stored.

## If claude.ai changes

Waypoints finds your messages by how claude.ai marks them on the page. If Claude redesigns its site and the rail goes empty, only the `SEL` block at the top of `content.js` needs updating. To find the new values, right-click one of your messages → **Inspect**.

## Permissions

- **claude.ai:** to show the rail and panel on Claude's pages.
- **Storage (unlimited):** to keep your times, saved messages and settings. "Unlimited" only means Chrome's default 10 MB limit doesn't apply.

Firefox and Chrome let you take away an extension's access to a site. If the rail disappears, click the Waypoints toolbar icon: it asks for claude.ai access again. In Firefox you can also open the puzzle-piece menu and choose **Always allow on claude.ai** for Waypoints.

## Disclaimer

Waypoints is an unofficial project and isn't affiliated with or endorsed by Anthropic.

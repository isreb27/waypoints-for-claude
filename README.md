# Waypoints for Claude

A lightweight browser extension for Chrome, Brave, Edge and other Chromium browsers that makes long conversations on [claude.ai](https://claude.ai) easy to find your way around.

- **Message rail:** a slim strip on the right edge with one mark per message you sent. Click a mark to jump straight to that message. Hover the strip to see a list of all your messages, with the time you sent each one.
- **Send times, recorded automatically:** every message you send is stored with its date and time.
- **Saved messages:** bookmark any of your messages, in any chat, and add a note. Clicking a saved message jumps to it, or opens its chat in a new tab and jumps there.
- **History:** everything you've sent, across all chats, grouped by day and searchable.
- **Keyboard shortcuts:** move between your messages without scrolling.

It runs only on claude.ai, uses no libraries, and does its work only when the page changes.

## Installation

1. Download this repository (**Code → Download ZIP**) and unzip it into a folder you'll keep.
2. Open `chrome://extensions` (or `brave://extensions` or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder.
5. Reload any open claude.ai tabs.
6. Optional: pin the icon (puzzle piece → pin). Clicking it opens or closes the panel.

## Using it

**The rail.** The marks on the right edge are your messages, top to bottom. The highlighted one is where you are, and saved messages show in the accent color. Click a mark to jump there.

**The message list.** Hover the rail to open a list of your messages, with day headers and send times. Click one to jump to it, or click its bookmark to save it. The pin keeps the list open.

**Hovering a message.** When you hover one of your messages in the chat, a small label shows when you sent it, with a button to save it.

**The panel.** Open it with the icon at the top of the rail, or with the toolbar icon. It has four tabs:

| Tab | What's there |
| --- | --- |
| This chat | Your messages in this chat, with times and search |
| Saved | Your saved messages from all chats, with notes and search |
| History | Everything you've sent, grouped by day, with search |
| Settings | Display options, shortcuts, backup and delete |

**Shortcuts**

| Keys | Does |
| --- | --- |
| `Alt` + `↑` / `↓` | Previous / next of your messages |
| `Alt` + `S` | Save or unsave the current message |
| `Esc` | Close the panel |

## How send times work

When you press Enter in the message box, or click a send button, and your new message appears, Waypoints stores the time you sent it. Edits count too: the edited message gets the time you saved the edit.

Messages sent before you installed Waypoints, or from another device or browser, have no time. Browsing old chats or switching between edited versions of a message never records a time.

## Your data

Everything is stored in this browser's extension storage. Nothing is sent anywhere, and claude.ai itself can't read it.

For each message you send, Waypoints stores the chat ID, a short fingerprint of the text, the first 300 characters, and the time. Saved messages keep up to 600 characters plus your note.

Settings → **Export backup** saves everything to a file, and **Import backup** merges a file back in, for example on another computer.

## If claude.ai changes

Waypoints finds your messages by how claude.ai marks them on the page. If Claude redesigns its site and the rail goes empty, only the `SEL` block at the top of `content.js` needs updating. To find the new values, right-click one of your messages → **Inspect**.

## Permissions

- **claude.ai:** to show the rail and panel on Claude's pages.
- **Storage (unlimited):** to keep your times, saved messages and settings. "Unlimited" only means the browser's default 10 MB limit doesn't apply.

## Disclaimer

Waypoints is an unofficial project and isn't affiliated with or endorsed by Anthropic.

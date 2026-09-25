# Store listing: Waypoints for Claude

The listing text, answers and images used for the Chrome Web Store and Firefox Add-ons (AMO). Keep this file in sync with the extension, so the store pages always describe what it actually does.

## Assets

| File                                         | Size                                   | Chrome Web Store                   | Firefox Add-ons          |
| -------------------------------------------- | -------------------------------------- | ---------------------------------- | ------------------------ |
| `icons/icon128.png`                          | 128×128 (96×96 artwork, 16 px padding) | Store icon (required)              | Taken from the extension |
| `store/screenshots/01-message-rail.png`      | 1280×800                               | Screenshot 1 (at least 1 required) | Screenshot 1             |
| `store/screenshots/02-send-times.png`        | 1280×800                               | Screenshot 2                       | Screenshot 2             |
| `store/screenshots/03-saved-messages.png`    | 1280×800                               | Screenshot 3                       | Screenshot 3             |
| `store/screenshots/04-history.png`           | 1280×800                               | Screenshot 4                       | Screenshot 4             |
| `store/screenshots/05-private-by-design.png` | 1280×800                               | Screenshot 5                       | Screenshot 5             |
| `store/promo/small-tile-440x280.png`         | 440×280                                | Small promo tile (required)        | Not used                 |
| `store/promo/marquee-1400x560.png`           | 1400×560                               | Marquee promo tile (optional)      | Not used                 |

The screenshots show the real extension running on a demo chat page. Replacements should stay at 1280×800.

## Shared details

**Name:** Waypoints for Claude

**Summary** (79 characters; Chrome's limit is 132, Firefox's is 250):

> Navigate your Claude chats, save messages, and keep the time you sent each one.

**Description** (plain text, works in both stores):

```
Long conversations on claude.ai are hard to find your way around. Waypoints adds a slim rail on the right edge with one mark for each message you sent, so you can jump straight to any of them.

• Message rail: click a mark to jump to that message. Hover the rail for a list of all your messages, with the time you sent each one.
• Send times: recorded automatically for every message you send.
• Saved messages: bookmark any of your messages, add a note, and jump back to it later, even from another chat.
• History: everything you've sent, across all your chats, grouped by day and searchable.
• Keyboard shortcuts: move between your messages without scrolling. You can change them.
• Light and dark mode: matches Claude's look.

PRIVACY
Everything stays in your browser. Waypoints has no server, no analytics and no tracking, and it never sends your data anywhere. It runs only on claude.ai, never in private windows. You can export or delete your data at any time from Settings.

PERMISSIONS
• Access to claude.ai (your browser shows this as "Read and change your data on claude.ai"): to show the rail and panel, and to read the messages you send there. No other site.
• Storage: to keep send times, saved messages and settings on your device.

Good to know: messages sent before you install Waypoints, or from another device, have no send time.

Waypoints is an unofficial project and isn't affiliated with or endorsed by Anthropic.
```

**Homepage:** this repository's GitHub URL.

**Support:** this repository's Issues page.

**Privacy policy:** the GitHub URL of [`PRIVACY.md`](../PRIVACY.md) on the `main` branch.

**Language:** English

## Chrome Web Store

Developer Dashboard: https://chrome.google.com/webstore/devconsole (one-time $5 registration). Upload a zip made with the command in the README.

### Store listing tab

- **Description:** the shared description above.
- **Category:** Productivity → Tools
- **Store icon, screenshots, promo tiles:** see the assets table.
- **Official URL / Homepage URL / Support URL:** see "Shared details" above.

### Privacy practices tab

**Single purpose:**

```
Waypoints helps you navigate your own messages in claude.ai conversations: jump between the messages you sent, see when you sent each one, and save the ones you want to find again.
```

**Permission justifications:**

| Permission                            | Justification                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                             | Saves the send times, saved messages, notes and settings in the browser's local extension storage. Nothing is sent off the device.                                                         |
| `unlimitedStorage`                    | Long-time users can build up more than the default 10 MB of send times and saved messages. This keeps new entries from failing once that limit is reached. Data still stays on the device. |
| Host permission `https://claude.ai/*` | Shows the message rail and panel on claude.ai and reads the messages the user sends there. The extension runs on no other site.                                                            |

**Remote code:** No, I am not using remote code.

**Data usage.** Tick these, because Waypoints stores parts of the user's own messages on their device:

- ☑ Personal communications (the text of messages the user sends)
- ☑ Website content (chat titles)

Leave every other category unticked.

**Certifications.** Tick all three:

- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** see "Shared details" above.

### Test instructions (optional)

```
Needs a claude.ai account (a free one works).
1. Open any chat on claude.ai and send a message. A mark appears on the rail at the right edge; hovering your message shows the time you sent it.
2. Hover the rail to see the list of your messages; click one to jump to it.
3. Click the bookmark next to a message to save it. Open the panel (icon at the top of the rail, or the toolbar icon) to see Saved, History and Settings.
The extension makes no network requests and contains no remote or minified code.
```

## Firefox Add-ons (public listing)

Private, self-distributed versions ("On your own") need none of this.

- **Summary:** the shared summary above.
- **Description:** the shared description above.
- **Categories:** Bookmarks, and Social & Communication.
- **Support site and homepage:** see "Shared details" above.
- **License:** the license in the repository's `LICENSE` file.
- **Privacy policy:** paste the text of `PRIVACY.md`.
- **Data collection:** already declared in the manifest as "none"; Firefox shows it on the install prompt.
- **Screenshots:** the five PNGs, with these captions:
    1. Jump to any message you sent: the rail and the list of your messages, with send times.
    2. See when you sent each message: times are recorded automatically as you send.
    3. Save the messages that matter: bookmark any message, add a note, jump back later.
    4. Everything you've sent, in one place: grouped by day and searchable.
    5. Private by design: stored only in your browser; runs only on claude.ai.
- **Notes to reviewer:** the Chrome test instructions above, plus: "The source is plain, unminified JavaScript with no dependencies or build step."

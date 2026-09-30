# AGENTS.md — Jasper-Blue-Light (Cinnamon 6.6 / GTK 3)

User-level theme in `~/.themes/Jasper-Blue-Light`. Human-oriented change log: `README.md`.
Read this file before editing anything here.

## Hard rules

1. **Back up before you edit any file.** Copy it to `~/.themes-backup/<YYYYMMDD-HHMMSS>/<same relative path>`.
   Never put backups inside `~/.themes` (they would show up as themes). Original backup: `~/.themes-backup/20260930-215323/`.
2. **No system-wide changes.** Stay inside `~/.themes` and `~/.local/share/cinnamon/extensions`. Do not touch `/usr`, `/etc`, or global GTK/Cinnamon files.
3. **Keep `cinnamon/cinnamon.css` and `cinnamon/cinnamon-new.css` byte-identical** (`cmp` them after every edit). Cinnamon loads `cinnamon.css`; the user also edits `-new`.
4. **`gtk-3.0/gtk.css` and `gtk-3.0/gtk-dark.css` get the same fix** when the change is not light/dark specific.
5. **Update `README.md`** (and this file if you learn a new pitfall) with every change you make.
6. Clean up what you create while testing (scratch files, test folders, anything you put in Trash).

## Files that matter

| File | Purpose |
|---|---|
| `cinnamon/cinnamon.css` | Cinnamon shell theme (panel, menus, notifications). ~3000 lines, generated-looking; edit in place. |
| `gtk-3.0/gtk.css`, `gtk-dark.css` | GTK3 apps incl. Nemo. ~8000 lines. Local Nemo fix is appended at the end. |
| `~/.local/share/cinnamon/extensions/compact-notifications@jasper/` | Companion extension (JS), **outside this folder**. Required for the compact notification layout. See the section below. |

## Companion extension: `compact-notifications@jasper`

**Path (source of truth):** `~/.local/share/cinnamon/extensions/compact-notifications@jasper/`
This lives **outside** the theme folder. Anything that backs up or publishes the theme (e.g. a GitHub repo of
`Jasper-Blue-Light`) must copy it separately, e.g. into `extras/compact-notifications@jasper/` in the repo, and keep the
two copies in sync. Edit the installed copy first, test it, then mirror it to the repo copy (if one exists).

| File | Purpose |
|---|---|
| `metadata.json` | `uuid` must equal the folder name (`compact-notifications@jasper`). Has an empty `url` (silences a Cinnamon warning). |
| `extension.js` | `init/enable/disable`. Patches `MessageTray.Notification.prototype`: `IMAGE_SIZE` getter (→ 64px), `setImage` (image top-aligned), `_setBodyArea` (trim to 240 chars / 5 lines with "…"). `disable()` restores every original. |

- **Enabled via** `gsettings get org.cinnamon enabled-extensions` → must contain `'compact-notifications@jasper'`.
- **Install on a new machine/account:**
  `cp -r <copy>/compact-notifications@jasper ~/.local/share/cinnamon/extensions/` then
  `gsettings set org.cinnamon enabled-extensions "['compact-notifications@jasper']"`
  (append to the existing list instead if other extensions are enabled).
- **Uninstall:** `gsettings set org.cinnamon enabled-extensions "[]"` (or remove just this uuid), then `rm -r` the folder.
- **Cinnamon updates can break it.** It depends on internals of `/usr/share/cinnamon/js/ui/messageTray.js`
  (`Notification.IMAGE_SIZE`, `setImage`, `_setBodyArea`, `this._table`, `this._imageBin`). After a Cinnamon upgrade, grep
  `~/.xsession-errors` for `compact-notifications`, re-read those members in `messageTray.js`, and patch the extension.
  If it cannot load, the theme still works but the image reverts to 125px against the 96px CSS `min-height`.

## Things that are coupled — change together or not at all

- `.notification-with-image { min-height: 96px }` in the CSS assumes the extension's `IMAGE_SIZE = 64`.
  Without the extension the image is 125px (default was `min-height: 159px`).
- Extension limits are constants at the top of `extension.js`: `IMAGE_SIZE`, `MAX_CHARS` (240), `MAX_LINES` (5).

## Pitfalls already discovered (do not re-derive)

- **CSS `max-height` does not cap notifications.** It limits only the natural height; a wrapped label's *minimum*
  height is its full wrapped height. Tried on `#notification`, `#notification-scrollview`, `#notification-body`,
  `.url-highlighter`, em and px — none work. Capping needs JS (the extension trims text).
- **Don't style `#notification > StBin` / `StBin`.** Type selectors match subclasses, so it also hits `StButton`
  (close + action buttons) and `StScrollView` (body). The image container has no class/name, so CSS can't target it alone.
- **Image size (125px) and centring are set in `messageTray.js`**, not CSS. The extension overrides
  `Notification.IMAGE_SIZE` and calls `_table.child_set(imageBin, {y_align: St.Align.START})` in `setImage`.
- **Nemo's ring comes from the global `*:focus { outline-color: alpha(currentColor, 0.1) }`** rule; the fix overrides
  `outline-*` for Nemo selectors only. Don't delete the global rule (other apps rely on it).
- `cinnamon-new.css` is just a mirror; it is not loaded by Cinnamon.

## Reloading to test

- Cinnamon theme: `gsettings set org.cinnamon.theme name 'cinnamon'; sleep 1.5; gsettings set org.cinnamon.theme name 'Jasper-Blue-Light'`
- GTK/Nemo: same pattern with `org.cinnamon.desktop.interface gtk-theme` (`'Adwaita'` then `'Jasper-Blue-Light'`).
  **Always restore the original value** and verify with `gsettings get`.
- Extension: `gsettings set org.cinnamon enabled-extensions "[]"`, wait, then set it back to
  `"['compact-notifications@jasper']"`. Check `~/.xsession-errors` for `compact-notifications` lines.
  (A `Missing property "url"` warning is harmless; `metadata.json` has an empty `url`.)
- Session is X11; `gnome-screenshot -f out.png` works for screenshots.

## How to test notifications

- Plain: `notify-send -t 8000 "Title" "Body"`.
- **Large image** only appears when BOTH an app icon and an image are given:
  `notify-send -i mail-unread -h string:image-path:/abs/path/img.png "Title" "Body"`
  (with only `image-path`, Cinnamon shows a small icon instead).
- **Long text:** send ~40 repeated sentences; expect ≤5 lines ending with "…".
- **Notifications queue.** Earlier ones keep showing (and real ones from Teams/Brave arrive), so a screenshot may show
  an old notification. Use a unique title per test, wait for the queue to drain, and confirm the title is in the shot.
  Don't use `sleep N` with large N in the foreground; use a background wait or `timeout N tail -f /dev/null`.

## How to test the Nemo focus fix

Nemo is single-instance, so a private D-Bus session doesn't work well (it spawns portals/keyring). Instead:
reload the GTK theme, then `nemo <scratch-dir-with-folders>`, click the first folder, press `Delete`, move the pointer away,
screenshot. Next item must have no rounded ring. Synthetic input is available via `python-xlib` (XTEST); `xdotool` is not installed.
Remove your test folders from `~/.local/share/Trash/{files,info}` afterwards (only entries you created).

## Extension conventions

- Only monkeypatch `MessageTray.Notification.prototype` members; every patch must be undone in `disable()`.
- Validate with `node --check extension.js` and `python3 -c "import json;json.load(open('metadata.json'))"` before enabling.
- Trimmed bodies are rendered as plain text (markup stripped) to avoid broken tags.
- Do not add hard dependencies on other extensions or system files.

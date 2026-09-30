// Compact Notifications
// - shrinks the big notification image (default 125px) to IMAGE_SIZE
// - keeps the image top-aligned
// - trims very long bodies to MAX_CHARS / MAX_LINES so a notification can't fill the screen
// Everything is undone by disable(); nothing outside this extension is modified.

const MessageTray = imports.ui.messageTray;
const St = imports.gi.St;

const IMAGE_SIZE = 64;
const MAX_CHARS = 240;
const MAX_LINES = 5;

let origImageSize = null;
let origSetBodyArea = null;
let origSetImage = null;

function _plain(text) {
    return text.replace(/<[^>]*>/g, '')
               .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
               .replace(/&amp;/g, '&');
}

function _trim(text, allowMarkup) {
    if (!text)
        return [text, allowMarkup];

    let lines = text.split('\n');
    if (text.length <= MAX_CHARS && lines.length <= MAX_LINES)
        return [text, allowMarkup];

    // Cutting markup mid-tag would break it, so trimmed text is shown as plain text.
    let plain = allowMarkup ? _plain(text) : text;
    plain = plain.split('\n').slice(0, MAX_LINES).join('\n');
    if (plain.length > MAX_CHARS) {
        plain = plain.substring(0, MAX_CHARS);
        let lastSpace = plain.lastIndexOf(' ');
        if (lastSpace > MAX_CHARS * 0.6)
            plain = plain.substring(0, lastSpace);
    }
    return [plain.replace(/\s+$/, '') + '…', false];
}

function init(meta) {
}

function enable() {
    let proto = MessageTray.Notification.prototype;

    origImageSize = Object.getOwnPropertyDescriptor(proto, 'IMAGE_SIZE');
    Object.defineProperty(proto, 'IMAGE_SIZE', {
        get: function () { return IMAGE_SIZE; },
        configurable: true
    });

    origSetBodyArea = proto._setBodyArea;
    proto._setBodyArea = function (text, allowMarkup) {
        let [t, m] = _trim(text, allowMarkup);
        return origSetBodyArea.call(this, t, m);
    };

    // keep the image at the top of the card instead of vertically centred
    origSetImage = proto.setImage;
    proto.setImage = function (image) {
        origSetImage.call(this, image);
        if (this._imageBin)
            this._table.child_set(this._imageBin, { y_align: St.Align.START });
    };
}

function disable() {
    let proto = MessageTray.Notification.prototype;

    if (origImageSize)
        Object.defineProperty(proto, 'IMAGE_SIZE', origImageSize);
    origImageSize = null;

    if (origSetBodyArea)
        proto._setBodyArea = origSetBodyArea;
    origSetBodyArea = null;

    if (origSetImage)
        proto.setImage = origSetImage;
    origSetImage = null;
}

# hermes-dictation-send

Hermes dictation has no shortcut, and hitting stop just dumps the transcript in the composer. This plugin adds a shortcut and sends after you stop.

I wrote it for myself. Publishing it in case someone else wants the same thing.

## What it does

Ctrl+Shift+D starts and stops dictation. After you stop, it waits for the transcript and clicks Send.

Change the shortcut in Settings → Keybinds → Toggle dictation. You are not stuck with Ctrl+Shift+D.

The status bar chip says `mic send` or `mic edit`. Click it if you want the text to stay in the composer.

This is not the full voice conversation. That is still Ctrl+B.

## Install

```bash
git clone https://github.com/ganidhu/hermes-dictation-send.git ~/.hermes/desktop-plugins/dictation-send
```

Then in Hermes: ⌘K → Reload desktop plugins.

The folder name has to stay `dictation-send`. That is the plugin id.

## Stuff that will bite you

The plugin clicks Hermes' own dictation button. If that control moves or gets renamed, the shortcut can miss.

No speech means nothing gets sent.

If the composer folds voice into a menu, the shortcut opens that menu first. A bit clumsy. Still works.

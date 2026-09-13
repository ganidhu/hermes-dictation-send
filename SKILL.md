---
name: hermes-dictation-send
description: Install the Hermes desktop dictation shortcut plugin.
version: 0.1.0
author: Ganidhu Kandepola (ganidhu), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [hermes, desktop-plugin, dictation, stt]
    related_skills: [hermes-desktop-plugins]
---

# hermes-dictation-send

Hermes desktop plugin. Adds a dictation shortcut and sends the transcript after stop.

Core Hermes has no dictation hotkey. Ctrl+B is the full voice conversation, which is a different thing.

## When to use

- User wants a shortcut to start/stop composer dictation
- User wants dictation to send instead of sitting in the composer

## Install

```bash
git clone https://github.com/ganidhu/hermes-dictation-send.git ~/.hermes/desktop-plugins/dictation-send
```

Then ⌘K → Reload desktop plugins. Folder name must stay `dictation-send`.

Done when Settings → Plugins shows Dictation send, and Ctrl+Shift+D toggles the mic.

## Pitfalls

- Rebind in Settings → Keybinds → Toggle dictation. Default is Ctrl+Shift+D.
- Status bar chip `mic send` / `mic edit` turns auto-send off.
- Plugin clicks the real dictation control. A Hermes UI change can break it.
- No speech = nothing sent.
- Profile swaps remount the composer. The shortcut targets the focused chat and waits briefly if the new profile is still connecting.

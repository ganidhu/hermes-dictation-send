/**
 * Dictation shortcut + auto-send.
 *
 * Core only binds Ctrl+B to the full voice conversation, not push-to-talk
 * dictation. Stopping dictation also just stages text in the composer.
 *
 * This plugin:
 *   - Ctrl+Shift+D toggles dictation (rebind in Settings → Keybinds)
 *   - After stop + transcript, clicks Send (chip toggles this off)
 *
 * It drives the real composer controls via the DOM. There is no public
 * dictate()/submit() plugin API.
 */
import {
  KEYBINDS_AREA,
  PALETTE_AREA,
  atom,
  cn,
  haptic,
  host,
  Tip,
  useValue,
} from '@hermes/plugin-sdk'
import { jsx } from 'react/jsx-runtime'

const ID = 'dictation-send'
const HIDDEN_PANE = '[data-pane-hidden]'

const $autoSend = atom(true)
const $phase = atom('idle')

let persistAutoSend = () => {}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isHidden(el) {
  return Boolean(el?.closest?.(HIDDEN_PANE))
}

function visibleAll(selector, root = document) {
  return [...root.querySelectorAll(selector)].filter(el => !isHidden(el))
}

function visible(selector, root = document) {
  return visibleAll(selector, root)[0] ?? null
}

function composerRoot() {
  return visible('[data-slot="composer-root"]')
}

function composerText() {
  const editor = visible('[data-slot="composer-rich-input"]')
  return (editor?.innerText || '').replace(/\u00a0/g, ' ').trim()
}

function isDictationLabel(label) {
  return /dictat|听写|聽寫|口述|диктов|إملاء/i.test(label || '')
}

function isVoiceMenuTrigger(label) {
  const value = (label || '').trim()
  if (!value) return false
  if (isDictationLabel(value)) return true
  if (/wake word/i.test(value)) return true
  return /^(voice|音声|語音|语音|голос|صوت)$/i.test(value)
}

function dictationMenuItem() {
  return (
    visibleAll('[role="menuitemcheckbox"]').find(el => isDictationLabel(el.textContent || '')) ||
    null
  )
}

function standaloneDictationButton(root) {
  return (
    visibleAll('button[aria-pressed][aria-label]', root).find(el =>
      isDictationLabel(el.getAttribute('aria-label'))
    ) || null
  )
}

function voiceMenuTrigger(root) {
  return (
    visibleAll('button[aria-haspopup]', root).find(el =>
      isVoiceMenuTrigger(el.getAttribute('aria-label'))
    ) || null
  )
}

function currentPhase() {
  const labels = visibleAll('button[aria-label]').map(el =>
    (el.getAttribute('aria-label') || '').toLowerCase()
  )
  if (labels.some(label => label.includes('transcribing dictation') || /transcribing/.test(label) && isDictationLabel(label))) {
    return 'transcribing'
  }
  if (labels.some(label => label.includes('stop dictation') || (/stop/.test(label) && isDictationLabel(label)))) {
    return 'recording'
  }
  return 'idle'
}

function sendButton() {
  const root = composerRoot()
  if (!root) return null
  return (
    visibleAll('button[type="submit"]', root).find(el => {
      const label = (el.getAttribute('aria-label') || '').toLowerCase()
      return label === 'send' || label.includes('send')
    }) || null
  )
}

async function waitFor(check, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const value = check()
    if (value) return value
    await wait(40)
  }
  return null
}

async function toggleDictation() {
  const root = composerRoot()
  if (!root) {
    host.notify({ kind: 'warning', message: 'No composer on screen' })
    return
  }

  const openItem = dictationMenuItem()
  if (openItem) {
    if (openItem.getAttribute('aria-disabled') === 'true') return
    haptic('tap')
    openItem.click()
    return
  }

  const mic = standaloneDictationButton(root)
  if (mic) {
    if (mic.disabled) return
    haptic('tap')
    mic.click()
    return
  }

  const trigger = voiceMenuTrigger(root)
  if (!trigger || trigger.disabled) {
    host.notify({ kind: 'warning', message: 'Dictation control not found' })
    return
  }

  haptic('tap')
  trigger.click()
  const item = await waitFor(dictationMenuItem, 900)
  if (!item || item.getAttribute('aria-disabled') === 'true') {
    host.notify({ kind: 'warning', message: 'Dictation menu item not found' })
    return
  }
  item.click()
}

let sending = false

async function sendAfterStop(before) {
  if (sending) return
  sending = true
  let sawTranscribe = currentPhase() === 'transcribing'
  const started = Date.now()
  try {
    while (true) {
      if (!$autoSend.get()) return
      const phase = currentPhase()
      if (phase === 'transcribing') sawTranscribe = true
      if (phase === 'recording') return

      const limit = sawTranscribe ? 20000 : 1500
      if (Date.now() - started > limit) return

      const text = composerText()
      if (phase === 'idle' && text && text !== before) {
        const button = sendButton()
        if (button && !button.disabled) {
          haptic('tap')
          button.click()
          return
        }
      }
      await wait(40)
    }
  } finally {
    sending = false
  }
}

function syncPhase() {
  const next = currentPhase()
  const prev = $phase.get()
  if (next === prev) return

  let snapshot = syncPhase.snapshot || ''
  if (next === 'recording' && prev === 'idle') {
    snapshot = composerText()
    syncPhase.snapshot = snapshot
  }
  $phase.set(next)

  if (prev === 'recording' && next !== 'recording' && $autoSend.get()) {
    void sendAfterStop(syncPhase.snapshot || snapshot)
  }
}
syncPhase.snapshot = ''

function Chip() {
  const auto = useValue($autoSend)
  const phase = useValue($phase)
  const recording = phase === 'recording'
  const transcribing = phase === 'transcribing'
  const label = recording ? 'mic rec' : transcribing ? 'mic …' : auto ? 'mic send' : 'mic edit'
  const tip = auto
    ? 'Dictation auto-sends on stop. Click to stage in the composer instead.'
    : 'Dictation stages in the composer. Click to auto-send on stop.'

  return jsx(Tip, {
    label: tip,
    children: jsx('button', {
      type: 'button',
      className: cn(
        'inline-flex h-full items-center gap-1 px-1.5 text-[0.6875rem] transition-colors',
        recording || transcribing
          ? 'text-(--ui-accent)'
          : 'text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-foreground'
      ),
      onClick: () => {
        haptic('tap')
        const next = !auto
        $autoSend.set(next)
        persistAutoSend()
        host.notify({
          kind: 'info',
          message: next ? 'Dictation will auto-send on stop' : 'Dictation will stay in the composer',
        })
      },
      children: label,
    }),
  })
}

function toggleAutoSend() {
  const next = !$autoSend.get()
  $autoSend.set(next)
  persistAutoSend()
  haptic('tap')
  host.notify({
    kind: 'info',
    message: next ? 'Dictation will auto-send on stop' : 'Dictation will stay in the composer',
  })
}

export default {
  id: ID,
  name: 'Dictation send',
  description: 'Shortcut to toggle dictation, and auto-send after you stop.',
  register(ctx) {
    const saved = ctx.storage.get('autoSend', true)
    $autoSend.set(saved !== false)
    persistAutoSend = () => ctx.storage.set('autoSend', $autoSend.get())

    const observer = new MutationObserver(() => syncPhase())
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-pressed', 'data-active', 'disabled'],
    })
    syncPhase()
    const poll = window.setInterval(syncPhase, 250)

    ctx.onDispose(() => {
      observer.disconnect()
      window.clearInterval(poll)
      persistAutoSend = () => {}
      sending = false
      $phase.set('idle')
    })

    ctx.register({
      id: 'chip',
      area: 'statusBar.right',
      order: 125,
      render: () => jsx(Chip, {}),
    })

    ctx.register({
      id: 'toggle',
      area: PALETTE_AREA,
      data: {
        id: 'dictation-send.toggle',
        label: 'Toggle dictation',
        keywords: ['dictate', 'dictation', 'mic', 'voice', 'speech', 'stt'],
        run: () => void toggleDictation(),
      },
    })

    ctx.register({
      id: 'auto',
      area: PALETTE_AREA,
      data: {
        id: 'dictation-send.auto',
        label: 'Toggle dictation auto-send',
        keywords: ['dictate', 'auto send', 'composer'],
        run: toggleAutoSend,
      },
    })

    ctx.register({
      id: 'key-toggle',
      area: KEYBINDS_AREA,
      data: {
        id: 'dictation-send.toggle',
        label: 'Toggle dictation',
        category: 'composer',
        defaults: ['ctrl+shift+d'],
        run: () => void toggleDictation(),
      },
    })
  },
}

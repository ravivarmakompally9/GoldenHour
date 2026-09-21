// tts.js — F15 Voice Guidance. CONTRACT STUB for milestone M1.
//
// The real implementation (speechSynthesis, te-IN / hi-IN / en-IN voices, rate 0.9, beeps)
// arrives with workstream WS5 in milestone M4. The contract is fixed now so other workstreams
// can already call say()/stop() without changes later:
//
//   say(key, vars)  speak the i18n string `key` in the chosen language (same text as on screen)
//   stop()          stop speaking immediately (mute button, leaving a screen)
//
// Until M4 these do nothing on purpose. Every instruction is always shown as text as well, so
// the app stays fully usable without voice.

// eslint-disable-next-line no-unused-vars
export function say(key, vars) {
  // M4: look up t(key, vars), cancel any current speech, then speak it.
}

export function stop() {
  // M4: speechSynthesis.cancel()
}

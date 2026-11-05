import { suppressUnhandledRejectionWarning } from '../utils/async'
import { isAndroid, isWebKit } from '../utils/browser'

export const enum SpecialFingerprint {
  /** The browser doesn't support AudioContext or baseLatency */
  NotSupported = -1,
  /** Entropy source is disabled because of console warnings */
  Disabled = -2,
  /** Weird case where `baseLatency` is not a float number but `Infinity` instead */
  NotFinite = -3,
}

export default function getAudioContextBaseLatency(): number {
  // The signal emits warning in Chrome and Firefox, therefore it is enabled on Safari where it doesn't produce warning
  // and on Android where it's less visible
  const isAllowedPlatform = isAndroid() || isWebKit()
  if (!isAllowedPlatform) {
    return SpecialFingerprint.Disabled
  }

  if (!window.AudioContext) {
    return SpecialFingerprint.NotSupported
  }

  const context = new AudioContext()
  const latency = context.baseLatency
  closeAudioContext(context)

  if (latency === null || latency === undefined) {
    return SpecialFingerprint.NotSupported
  }

  if (!isFinite(latency)) {
    return SpecialFingerprint.NotFinite
  }

  return latency
}

/**
 * Releases the audio hardware held by the context.
 * An unclosed AudioContext keeps the page registered in the system audio session.
 * On iOS this can interrupt or reroute audio from other apps, for example taking over CarPlay.
 */
function closeAudioContext(context: AudioContext) {
  try {
    const closePromise = context.close()
    if (closePromise) {
      suppressUnhandledRejectionWarning(closePromise)
    }
  } catch {
    // Old browsers may not support closing the context; the value is already read
  }
}

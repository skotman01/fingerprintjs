import { getBrowserVersion, isAndroid, isGecko, isWebKit } from '../../tests/utils'

import getAudioBaseLatency, { SpecialFingerprint } from './audio_base_latency'

describe('Sources', () => {
  describe('audioBaseLatency', () => {
    it("doesn't fail", () => {
      const result = getAudioBaseLatency()
      const isAllowedPlatform = isAndroid() || isWebKit()
      if (!isAllowedPlatform) {
        expect(result).toBe(SpecialFingerprint.Disabled)
        return
      }

      if (!hasBaseLatencySupport()) {
        expect(result).toBe(SpecialFingerprint.NotSupported)
        return
      }

      if (isGecko()) {
        expect(result).toBe(0)
      } else {
        expect(result).toBeGreaterThan(0)
      }
    })

    it('returns a stable value', () => {
      const first = getAudioBaseLatency()
      const second = getAudioBaseLatency()
      expect(second).toBe(first)
    })

    it('closes the audio context after reading the latency', () => {
      const isAllowedPlatform = isAndroid() || isWebKit()
      if (!isAllowedPlatform || !hasBaseLatencySupport()) {
        return
      }

      const OriginalAudioContext = window.AudioContext
      const closeSpy = jasmine.createSpy('close').and.returnValue(Promise.resolve())

      class MockAudioContext {
        get baseLatency() {
          return 0.01
        }

        close = closeSpy
      }

      window.AudioContext = MockAudioContext as unknown as typeof window.AudioContext

      try {
        expect(getAudioBaseLatency()).toBe(0.01)
        expect(closeSpy).toHaveBeenCalledTimes(1)
      } finally {
        window.AudioContext = OriginalAudioContext
      }
    })

    it('handles Infinity case correctly', () => {
      const isAllowedPlatform = isAndroid() || isWebKit()
      if (!isAllowedPlatform || !hasBaseLatencySupport()) {
        return
      }

      const OriginalAudioContext = window.AudioContext

      class MockAudioContext {
        get baseLatency() {
          return Infinity
        }

        close() {
          return Promise.resolve()
        }
      }

      window.AudioContext = MockAudioContext as typeof window.AudioContext

      try {
        const result = getAudioBaseLatency()
        expect(result).toBe(SpecialFingerprint.NotFinite)
      } finally {
        window.AudioContext = OriginalAudioContext
      }
    })
  })
})

function hasBaseLatencySupport() {
  if (isWebKit()) {
    const { major, minor } = getBrowserVersion() || { major: 0, minor: 0 }
    if (major < 14) {
      return false
    } else if (major === 14) {
      return minor >= 1
    }
  }
  return true
}

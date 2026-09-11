import { yin } from '@audio/pitch'
import extractRms from 'meyda/dist/esm/extractors/rms.js'

const FFT_SIZE = 8192
const NOISE_FLOOR_SMOOTHING = 0.05
const MINIMUM_PITCH_HZ = 80
const MAXIMUM_PITCH_HZ = 1_000
const MINIMUM_PITCH_RMS = 0.01
const PITCH_ANALYSIS_INTERVAL = 0.05

function detectPitch(samples, sampleRate, rms) {
  if (rms < MINIMUM_PITCH_RMS) return null

  return (
    yin(samples, {
      fs: sampleRate,
      maxFreq: MAXIMUM_PITCH_HZ,
      minFreq: MINIMUM_PITCH_HZ,
    })?.freq ?? null
  )
}

export class MeydaMicrophoneInput {
  audioEngine
  analyser = null
  animationFrame = null
  input = null
  onAnalysis = null
  onSound = null
  samples = null
  startPromise = null
  startToken = 0
  stream = null

  constructor(audioEngine) {
    this.audioEngine = audioEngine
  }

  start({ onAnalysis = null, onSound, options = {} }) {
    this.onAnalysis = onAnalysis
    this.onSound = onSound
    if (this.stream) return Promise.resolve()
    if (this.startPromise) return this.startPromise

    const startPromise = this.#open(options)
    this.startPromise = startPromise
    return startPromise.finally(() => {
      if (this.startPromise === startPromise) {
        this.startPromise = null
      }
    })
  }

  async #open(options) {
    const token = ++this.startToken
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.getUserMedia) {
      throw new Error('Microphone input is not supported by this browser')
    }

    const context = this.audioEngine.getContext()
    if (context.state === 'suspended') {
      await context.resume()
    }

    const stream = await mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
      },
    })
    if (token !== this.startToken) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    const input = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0
    input.connect(analyser)

    this.stream = stream
    this.input = input
    this.analyser = analyser
    this.samples = new Float32Array(analyser.fftSize)
    this.#listen(context, options)
  }

  stop() {
    this.startToken += 1
    this.startPromise = null
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
    }
    this.input?.disconnect()
    this.analyser?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.animationFrame = null
    this.input = null
    this.analyser = null
    this.samples = null
    this.stream = null
    this.onAnalysis?.({
      active: false,
      pitch: null,
      rms: 0,
      sounding: false,
    })
  }

  destroy() {
    this.stop()
    this.onAnalysis = null
    this.onSound = null
  }

  #listen(context, {
    minimumInterval = 0.1,
    minimumRms = 0.025,
    noiseFloorMultiplier = 3,
    releaseRatio = 0.55,
  }) {
    let isSounding = false
    let lastSoundTime = Number.NEGATIVE_INFINITY
    let noiseFloor = minimumRms / noiseFloorMultiplier
    let lastPitchAnalysisTime = Number.NEGATIVE_INFINITY
    let pitch = null

    const analyze = () => {
      if (!this.analyser || !this.samples) return

      this.analyser.getFloatTimeDomainData(this.samples)
      const rms = extractRms({ signal: this.samples })
      if (rms < MINIMUM_PITCH_RMS) {
        pitch = null
      } else if (
        context.currentTime - lastPitchAnalysisTime >=
        PITCH_ANALYSIS_INTERVAL
      ) {
        pitch = detectPitch(this.samples, context.sampleRate, rms)
        lastPitchAnalysisTime = context.currentTime
      }
      const threshold = Math.max(
        minimumRms,
        noiseFloor * noiseFloorMultiplier,
      )
      const contextTime =
        context.currentTime - this.samples.length / context.sampleRate / 2

      if (isSounding) {
        if (rms < threshold * releaseRatio) {
          isSounding = false
          pitch = null
        }
      } else if (
        rms >= threshold &&
        contextTime - lastSoundTime >= minimumInterval
      ) {
        isSounding = true
        lastSoundTime = contextTime
        this.onSound?.({ contextTime, rms })
      } else {
        noiseFloor += (rms - noiseFloor) * NOISE_FLOOR_SMOOTHING
      }
      this.onAnalysis?.({
        active: true,
        pitch,
        rms,
        sounding: isSounding,
      })

      this.animationFrame = requestAnimationFrame(analyze)
    }

    analyze()
  }
}

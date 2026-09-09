import extractRms from 'meyda/dist/esm/extractors/rms.js'

const FFT_SIZE = 512
const NOISE_FLOOR_SMOOTHING = 0.05
const MINIMUM_PITCH_HZ = 80
const MAXIMUM_PITCH_HZ = 1_000
const MINIMUM_PITCH_RMS = 0.01
const MINIMUM_PITCH_CORRELATION = 0.7

function detectPitch(samples, sampleRate, rms) {
  if (rms < MINIMUM_PITCH_RMS) return null

  const minimumLag = Math.floor(sampleRate / MAXIMUM_PITCH_HZ)
  const maximumLag = Math.min(
    Math.floor(sampleRate / MINIMUM_PITCH_HZ),
    samples.length - 1,
  )
  let bestLag = 0
  let bestCorrelation = MINIMUM_PITCH_CORRELATION

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0
    let firstEnergy = 0
    let secondEnergy = 0

    for (let index = 0; index < samples.length - lag; index += 1) {
      const first = samples[index]
      const second = samples[index + lag]
      correlation += first * second
      firstEnergy += first * first
      secondEnergy += second * second
    }

    const normalizedCorrelation =
      correlation / Math.sqrt(firstEnergy * secondEnergy)
    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation
      bestLag = lag
    }
  }

  return bestLag === 0 ? null : sampleRate / bestLag
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
        echoCancellation: true,
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
    this.onAnalysis?.({ active: false, pitch: null, rms: 0 })
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

    const analyze = () => {
      if (!this.analyser || !this.samples) return

      this.analyser.getFloatTimeDomainData(this.samples)
      const rms = extractRms({ signal: this.samples })
      this.onAnalysis?.({
        active: true,
        pitch: detectPitch(this.samples, context.sampleRate, rms),
        rms,
      })
      const threshold = Math.max(
        minimumRms,
        noiseFloor * noiseFloorMultiplier,
      )
      const contextTime =
        context.currentTime - this.samples.length / context.sampleRate / 2

      if (isSounding) {
        if (rms < threshold * releaseRatio) {
          isSounding = false
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

      this.animationFrame = requestAnimationFrame(analyze)
    }

    analyze()
  }
}

export class AudioEngine {
  context = null
  trackSource = null
  playbackStartedAt = null
  buffers = new Map()
  oneShotSources = new Set()

  async preload(urls) {
    const context = this.#getContext()
    if (context.state === 'suspended') {
      await context.resume()
    }
    await Promise.all([...new Set(urls)].map((url) => this.#loadBuffer(url)))
  }

  async play(url, options = {}) {
    return this.startTrack(url, options)
  }

  async startTrack(url, { loop = false, onEnded } = {}) {
    const context = this.#getContext()
    if (context.state === 'suspended') {
      await context.resume()
    }
    const buffer = await this.#loadBuffer(url)
    this.stop()

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.connect(context.destination)
    source.addEventListener('ended', () => {
      if (this.trackSource === source) {
        this.trackSource = null
        this.playbackStartedAt = null
        onEnded?.()
      }
    })
    this.playbackStartedAt = context.currentTime
    source.start(this.playbackStartedAt)
    this.trackSource = source
  }

  async scheduleSound(url, playbackTime) {
    if (this.playbackStartedAt === null) return null
    const context = this.#getContext()
    const buffer = await this.#loadBuffer(url)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    this.oneShotSources.add(source)
    source.addEventListener('ended', () => {
      this.oneShotSources.delete(source)
      source.disconnect()
    })
    source.start(Math.max(context.currentTime, this.playbackStartedAt + playbackTime))
    return source
  }

  async playSound(url) {
    const context = this.#getContext()
    if (context.state === 'suspended') {
      await context.resume()
    }
    const buffer = await this.#loadBuffer(url)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    this.oneShotSources.add(source)
    source.addEventListener('ended', () => {
      this.oneShotSources.delete(source)
      source.disconnect()
    })
    source.start()
    return source
  }

  stop() {
    if (this.trackSource) {
      this.trackSource.stop()
      this.trackSource.disconnect()
      this.trackSource = null
    }
    this.oneShotSources.forEach((source) => {
      source.stop()
      source.disconnect()
    })
    this.oneShotSources.clear()
    this.playbackStartedAt = null
  }

  async pause() {
    if (this.context?.state === 'running' && this.trackSource) {
      await this.context.suspend()
    }
  }

  async resume() {
    if (this.context?.state === 'suspended' && this.trackSource) {
      await this.context.resume()
    }
  }

  destroy() {
    this.stop()
    this.buffers.clear()
    this.context?.close()
    this.context = null
  }

  get currentTime() {
    return this.context?.currentTime ?? 0
  }

  getPlaybackTime({ calibrationOffset = 0, compensateLatency = true } = {}) {
    if (!this.context || this.playbackStartedAt === null) {
      return null
    }

    const outputLatency = compensateLatency
      ? (this.context.baseLatency ?? 0) + (this.context.outputLatency ?? 0)
      : 0

    return (
      this.context.currentTime -
      this.playbackStartedAt -
      outputLatency +
      calibrationOffset
    )
  }

  #getContext() {
    if (!this.context) {
      this.context = new AudioContext()
    }

    return this.context
  }

  async #loadBuffer(url) {
    if (this.buffers.has(url)) {
      return this.buffers.get(url)
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Unable to load audio: ${response.status}`)
    }

    const encodedAudio = await response.arrayBuffer()
    const buffer = await this.context.decodeAudioData(encodedAudio)
    this.buffers.set(url, buffer)
    return buffer
  }
}

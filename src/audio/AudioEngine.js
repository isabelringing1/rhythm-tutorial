export class AudioEngine {
  context = null
  activeSource = null
  playbackStartedAt = null
  buffers = new Map()

  async play(url, { onEnded } = {}) {
    const context = this.#getContext()

    if (context.state === 'suspended') {
      await context.resume()
    }

    const buffer = await this.#loadBuffer(url)
    this.stop()

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.addEventListener('ended', () => {
      if (this.activeSource === source) {
        this.activeSource = null
        this.playbackStartedAt = null
        onEnded?.()
      }
    })
    this.playbackStartedAt = context.currentTime
    source.start(this.playbackStartedAt)
    this.activeSource = source
  }

  stop() {
    if (!this.activeSource) return

    this.activeSource.stop()
    this.activeSource.disconnect()
    this.activeSource = null
    this.playbackStartedAt = null
  }

  async pause() {
    if (this.context?.state === 'running' && this.activeSource) {
      await this.context.suspend()
    }
  }

  async resume() {
    if (this.context?.state === 'suspended' && this.activeSource) {
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

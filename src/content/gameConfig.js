import { compileGameConfig } from '../game/rhythmPattern.js'

const rawGameConfig = {
  defaults: {
    timing: {
      calibrationOffset: 0,
      perfectWindow: 0.06,
      goodWindow: 0.14,
    },
  },
  steps: [
    {
      type: 'dialogue',
      lines: [
        'Hey there. You’re about to play an amazing rhythm game. Everyone’s been raving about it!',
        'You should practice first. Don\'t worry, it won\'t take long.',
        'Press J to ring the bell when it’s your turn in line.',
      ],
      lastLineStick: true,
    },
    {
      type: 'play',
      bpm: 125,
      beatsPerBar: 4,
      stepsPerBeat: 4,
      pattern: 'x... .... .... ....',
      backingTrack: '/audio/bottle.mp3',
      hitSound: '/audio/bell.wav',
      requiredSuccesses: 3,
      poseDuration: 0.12,
    },
    {
      type: 'dialogue',
      lines: [
        'Nice. Sometimes, the pattern might change.',
        'Let\'s try again with a harder rhythm.',
      ],
      lastLineStick: true,
    },
    {
      type: 'play',
      bpm: 125,
      beatsPerBar: 4,
      stepsPerBeat: 4,
      pattern: 'x..x .... x... ....',
      backingTrack: '/audio/bottle.mp3',
      hitSound: '/audio/bell.wav',
      requiredSuccesses: 3,
      poseDuration: 0.12,
    },

    {
      type: 'dialogue',
      lines: [
        'Great! Try to remember that when the real thing starts.',
        '...Oh, you thought we were starting now? Sorry, there\'s more.',
      ],
      lastLineStick: true,
    },
  ],
}

export const GAME_CONFIG = compileGameConfig(rawGameConfig)

import { compileGameConfig } from '../game/rhythmPattern.js'
import { INSTRUMENTS } from './instrumentConfig.js'

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
      patterns: [
        {
          instrumentId: 'bell',
          pattern: 'x... .... .... ....',
        },
      ],
      backingTrack: '/audio/bottle.mp3',
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
      patterns: [
        {
          instrumentId: 'bell',
          pattern: 'x..x .... x... ....',
        },
      ],
      backingTrack: '/audio/bottle.mp3',
      requiredSuccesses: 3,
      poseDuration: 0.12,
    },
    {
      type: 'dialogue',
      lines: [
        'Great! Try to remember that when the real thing starts.',
        '...Oh, you thought we were starting now? Sorry, there\'s more.',
        '[{pen}=true]',
        'Look! You have a pen. One of those clicky ones, too.',
        'Press and release K to click the pen. Here, try it out a bit.',
      ],
      lineToCharacterState: {
        3: [[2, 'face', 'lookRight']],
      },
      lastLineStick: true,
    },
    {
      type: 'try',
      instrumentId: 'pen',
      numNotes: 14,
    },
    {
      type: 'dialogue',
      lines: [
        'Okay, okay!',
        'Let\'s practice with the pen in line now.',
      ]
    },
    {
      type: 'play',
      bpm: 125,
      beatsPerBar: 4,
      stepsPerBeat: 4,
      patterns: [
        {
          instrumentId: 'pen',
          pattern: 'd..u .... d... u...',
        },
      ],
      backingTrack: '/audio/bottle.mp3',
      requiredSuccesses: 3,
      poseDuration: 0.12,
    },
    {
      type: 'dialogue',
      lines: [
        'Good. But can you handle playing both instruments at once?'
      ]
    },
    {
      type: 'play',
      bpm: 125,
      beatsPerBar: 4,
      stepsPerBeat: 4,
      patterns: [
        {
          instrumentId: 'bell',
          pattern: 'x..x .... .... ....',
        },
        {
          instrumentId: 'pen',
          pattern: '.... .... d... u...',
        },
      ],
      backingTrack: '/audio/bottle.mp3',
      requiredSuccesses: 3,
      poseDuration: 0.12,
    },
  ],
}

export const GAME_CONFIG = compileGameConfig(rawGameConfig, INSTRUMENTS)

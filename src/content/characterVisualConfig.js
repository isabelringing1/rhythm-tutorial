export const GUY_VISUAL_CONFIG = Object.freeze({
  layers: Object.freeze([
    Object.freeze({
      id: 'body',
      type: 'fixed',
      src: '/sprites/guy/set/body.png',
    }),
    Object.freeze({
      id: 'leftArm',
      type: 'stateful',
      defaultState: 'default',
      states: Object.freeze({
        default: '/sprites/guy/left%20arm/default.png',
        up: '/sprites/guy/left%20arm/up.png',
      }),
    }),
    Object.freeze({
      id: 'rightArm',
      type: 'stateful',
      defaultState: 'default',
      states: Object.freeze({
        default: Object.freeze({
          '': '/sprites/guy/right%20arm/default_empty.png',
          pen: '/sprites/guy/right%20arm/default.png',
        }),
        upPressed: '/sprites/guy/right%20arm/up%20pressed.png',
        upReleased: '/sprites/guy/right%20arm/up%20released.png',
      }),
    }),
    Object.freeze({
      id: 'head',
      type: 'fixed',
      src: '/sprites/guy/set/head.png',
    }),
    Object.freeze({
      id: 'face',
      type: 'stateful',
      defaultState: 'default',
      states: Object.freeze({
        default: '/sprites/guy/face/default.png',
        happy: '/sprites/guy/face/happy.png',
        lookRight: '/sprites/guy/face/look_right.png',
        mad: '/sprites/guy/face/mad.png',
        sing: '/sprites/guy/face/sing_big.png',
      }),
    }),
  ]),
})

/* Ready-made moods. Each one only lists what differs from the defaults in text-tantrum.js;
   `look` styles the preview text and `sparkSame` makes the sparks use the letter colours. */
window.PRESETS = {
  original: {
    name: 'Original',
    look: { font: 'helvetica', weight: 200, color: '#ffffff', bg: '#07080a' },
    opts: {}
  },
  matrix: {
    name: 'Matrix rain',
    look: { font: 'mono', weight: 400, color: '#9dffbf', bg: '#020a04' },
    sparkSame: true,
    opts: {
      chars: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789',
      colors: ['#00ff66', '#39ff7a', '#b8ffcf', '#00b347'],
      glyphFont: 'ui-monospace, Menlo, Consolas, monospace', rgbSplit: 0, duration: [400, 700], flicker: [40, 80],
      sparks: { shape: 'glyph', count: 6, gravity: 520, speed: [30, 160], follow: [40, 260], life: [0.7, 1.5], size: [3, 5], drag: 2 }
    }
  },
  candy: {
    name: 'Candy shop',
    look: { font: 'system', weight: 800, color: '#3a2340', bg: '#fff4fa' },
    sparkSame: true,
    opts: {
      chars: '♥★●◆✿♪☺',
      colors: ['#ff6fb5', '#ffb238', '#38c6ff', '#9b6bff', '#2fd38a'],
      colorMode: 'cycle', rgbSplit: 0, jitter: 0.08, glyphScale: 0.7,
      sparks: { shape: 'circle', blend: 'normal', count: 8, gravity: 760, speed: [80, 380], follow: [100, 400], life: [0.6, 1.2], size: [4, 9], drag: 1.6, shrink: true }
    }
  },
  fire: {
    name: 'On fire',
    look: { font: 'helvetica', weight: 700, color: '#ffd9b0', bg: '#0d0502' },
    sparkSame: true,
    opts: {
      chars: '▲△^*~°•',
      colors: ['#ff3b00', '#ff8a00', '#ffd000', '#fff3b0'],
      rgbSplit: 0.04, splitColors: ['#ff2200', '#ffb000', '#ff6a00'],
      sparks: { count: 12, gravity: -620, speed: [40, 260], follow: [100, 400], life: [0.5, 1.2], size: [1.5, 3.5], drag: 2, glow: 10, shrink: true, max: 900 }
    }
  },
  terminal: {
    name: 'Terminal',
    look: { font: 'mono', weight: 400, color: '#e6e6e6', bg: '#0a0a0a' },
    opts: {
      chars: '01',
      colors: ['#e6e6e6', '#8a8a8a'],
      glyphFont: 'ui-monospace, Menlo, Consolas, monospace', glyphScale: 1, rgbSplit: 0, jitter: 0,
      duration: [400, 700], flicker: [50, 90], neighbours: 2, spill: 0.7,
      sparks: { enabled: false }
    }
  },
  confetti: {
    name: 'Confetti',
    look: { font: 'system', weight: 800, color: '#111111', bg: '#ffffff' },
    sparkSame: true,
    opts: {
      chars: '★✦✧❖◆●■▲',
      colors: ['#ff3d6e', '#ffc93c', '#2ec4ff', '#7a5cff', '#1fd18b', '#ff8a3d'],
      rgbSplit: 0, glyphScale: 0.75,
      sparks: { shape: 'square', blend: 'normal', count: 12, gravity: 1100, speed: [200, 700], follow: [100, 500], life: [1, 2], size: [4, 8], drag: 1.2, opacity: 1 }
    }
  },
  ghost: {
    name: 'Haunted',
    look: { font: 'serif', weight: 400, color: '#dfe6ee', bg: '#000000' },
    opts: {
      chars: '░▒▓█▌▐',
      colors: ['#ffffff', '#b9c6d6', '#7c8a9c'],
      rgbSplit: 0.08, auto: true, autoEvery: [300, 900], reveal: true, revealDuration: 900,
      sparks: { count: 5, opacity: 0.5, size: [1, 2.4], speed: [20, 140], follow: [60, 300], life: [0.8, 1.6], gravity: -60 }
    }
  }
};

# Text Tantrum

Letters that throw a little fit when you poke them. Move the pointer over the text and each letter it touches turns into a random sign in a loud colour, spits sparks, and snaps back.

- One small file, no dependencies, plain JavaScript
- Works on any element: headings, paragraphs, links, buttons
- The text keeps its width while letters scramble, so nothing jumps around
- Screen readers still read the real text
- Stays still for people who ask their system for less motion

**[Try it and make your own →](https://blue-grid.github.io/text-tantrum/)**

## Make your own

Open the [configurator](https://blue-grid.github.io/text-tantrum/) (or `index.html` from this repo). Pick colours, signs, sparks and timing, then press **Get the code**.

**Your script** gives you the whole effect as one file with your settings written into it. Every setting has a comment next to it, so you can keep changing it by hand later. Its last lines start it on your text: change the selector there to match your page.

## Use it

Straight from the CDN, nothing to download:

```html
<h1 class="tantrum">Hover over me to see the effect.</h1>

<script src="https://cdn.jsdelivr.net/gh/blue-grid/text-tantrum@0.1.1/text-tantrum.min.js"></script>
<script>
  TextTantrum('.tantrum');
</script>
```

Or with no script of your own:

```html
<h1 data-text-tantrum='{"colors":["#ff2a55","#00e5ff"]}'>Hover over me.</h1>
<script src="https://cdn.jsdelivr.net/gh/blue-grid/text-tantrum@0.1.1/text-tantrum.min.js"></script>
```

Or download [`text-tantrum.js`](text-tantrum.js) and host it yourself.

## Options

Ranges are `[min, max]`. A random value between the two is picked each time.

| Option | Default | What it does |
| --- | --- | --- |
| `chars` | `'!<>-_\/[]{}=+*^?#$%&@01:;~\|'` | The signs a letter can turn into |
| `colors` | six neon colours | Colours for the signs |
| `colorMode` | `'random'` | `'random'`, `'cycle'` (in order) or `'original'` (keep the text colour) |
| `trigger` | `'hover'` | `'hover'`, `'click'`, `'both'` or `'none'` |
| `duration` | `[260, 420]` | How long a letter scrambles, in ms |
| `flicker` | `[28, 60]` | Time between two signs, in ms |
| `neighbours` | `1` | Letters on each side that can catch the tantrum |
| `spill` | `0.5` | Chance that each neighbour catches it |
| `spillDuration` | `[120, 240]` | How long neighbours scramble, in ms |
| `jitter` | `0.05` | How far the sign wobbles, in em |
| `glyphScale` | `0.8` | Size of the sign compared with the letter |
| `glyphFont` | `''` | Font for the signs; empty uses the text's font |
| `glyphWeight` | `''` | Weight for the signs; empty uses the text's weight |
| `rgbSplit` | `0.05` | Colour-split shadow on the sign, in em; `0` turns it off |
| `splitColors` | red, cyan, green | The three colours of the split |
| `touch` | `true` | A tap scrambles the letters under the finger |
| `auto` | `false` | Letters throw tantrums on their own |
| `autoEvery` | `[500, 1500]` | Time between those, in ms |
| `reveal` | `false` | Scramble everything once on start, then settle |
| `revealDuration` | `700` | Length of the reveal, in ms |
| `revealStagger` | `18` | Extra delay per letter in the reveal, in ms |
| `respectReducedMotion` | `true` | Do nothing when the visitor prefers less motion |
| `sparks.enabled` | `true` | Sparks on or off |
| `sparks.count` | `16` | Sparks per letter hit |
| `sparks.colors` | RGB and white | Spark colours; `null` uses the sign colours |
| `sparks.shape` | `'circle'` | `'circle'`, `'square'`, `'line'`, `'star'` or `'glyph'` |
| `sparks.blend` | `'add'` | `'add'` glows (best on dark pages), `'normal'` for light pages |
| `sparks.speed` | `[120, 620]` | Speed in a random direction, px/s |
| `sparks.follow` | `[200, 900]` | Extra speed in the direction the pointer moves, px/s |
| `sparks.life` | `[0.35, 0.95]` | Life in seconds |
| `sparks.size` | `[2.2, 4.6]` | Size in px |
| `sparks.drag` | `3.4` | How quickly they slow down |
| `sparks.gravity` | `0` | px/s²; negative floats up |
| `sparks.scatter` | `0.18` | How far from the pointer they start, in em |
| `sparks.fade` | `1.4` | `1` fades evenly, higher fades sooner |
| `sparks.opacity` | `0.9` | |
| `sparks.glow` | `0` | Soft halo in px |
| `sparks.shrink` | `false` | Get smaller as they fade |
| `sparks.max` | `1500` | Most sparks on screen at once |
| `sparks.zIndex` | `2147483000` | Stacking order of the spark layer |

## Methods

```js
const t = TextTantrum('.tantrum', { trigger: 'both' });

t.burst();                 // scramble every letter now
t.burst(800, 20);          // for 800 ms, 20 ms later per letter
t.reveal();                // the start-up reveal, again
t.update({ colors: ['#fff'] });
t.destroy();               // put the original text back
```

## Browser support

Current Chrome, Edge, Firefox and Safari.

## Made by

[Omid Akbari](https://omid-akbari.com), senior product designer and creative technologist based in Düsseldorf, Germany. The effect started on [omid-akbari.com](https://omid-akbari.com).

## License

MIT. Use it anywhere, free.

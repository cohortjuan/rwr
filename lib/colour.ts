// Colour maths for the wardrobe: what a CSS filter does to a colour. It is how each fur's
// matching mane gets its colours (see lib/accessories.ts).

type Rgb = [number, number, number]

const clamp = (value: number) => Math.min(1, Math.max(0, value))

function toRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(clamp(channel) * 255).toString(16).padStart(2, '0')).join('')}`
}

const matrix = (rgb: Rgb, m: number[]): Rgb => [
  m[0] * rgb[0] + m[1] * rgb[1] + m[2] * rgb[2],
  m[3] * rgb[0] + m[4] * rgb[1] + m[5] * rgb[2],
  m[6] * rgb[0] + m[7] * rgb[1] + m[8] * rgb[2],
]

// The filter functions the fur colours use, as the CSS Filter Effects spec defines them.
const steps: Record<string, (rgb: Rgb, amount: number) => Rgb> = {
  grayscale: (rgb, amount) => {
    const keep = 1 - Math.min(1, amount)
    return matrix(rgb, [
      0.2126 + 0.7874 * keep, 0.7152 - 0.7152 * keep, 0.0722 - 0.0722 * keep,
      0.2126 - 0.2126 * keep, 0.7152 + 0.2848 * keep, 0.0722 - 0.0722 * keep,
      0.2126 - 0.2126 * keep, 0.7152 - 0.7152 * keep, 0.0722 + 0.9278 * keep,
    ])
  },
  saturate: (rgb, amount) =>
    matrix(rgb, [
      0.213 + 0.787 * amount, 0.715 - 0.715 * amount, 0.072 - 0.072 * amount,
      0.213 - 0.213 * amount, 0.715 + 0.285 * amount, 0.072 - 0.072 * amount,
      0.213 - 0.213 * amount, 0.715 - 0.715 * amount, 0.072 + 0.928 * amount,
    ]),
  'hue-rotate': (rgb, degrees) => {
    const cos = Math.cos((degrees * Math.PI) / 180)
    const sin = Math.sin((degrees * Math.PI) / 180)
    return matrix(rgb, [
      0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
    ])
  },
  brightness: (rgb, amount) => [rgb[0] * amount, rgb[1] * amount, rgb[2] * amount],
  contrast: (rgb, amount) => rgb.map((channel) => channel * amount + 0.5 - 0.5 * amount) as Rgb,
}

// The colour a CSS filter turns `hex` into, so art drawn beside a filtered sprite can match it.
export function applyFilter(hex: string, filter?: string): string {
  if (!filter) return hex
  let rgb = toRgb(hex)
  for (const [, name, amount] of filter.matchAll(/([a-z-]+)\((-?[\d.]+)(?:deg)?\)/g)) {
    const step = steps[name]
    if (step) rgb = step(rgb, Number(amount)).map(clamp) as Rgb
  }
  return toHex(rgb)
}

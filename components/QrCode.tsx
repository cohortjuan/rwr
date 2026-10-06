import qrcode from 'qrcode-generator'

// A QR code drawn as crisp squares, in the game's ink and cream. The lowest error-correction
// level keeps the grid coarse, which suits a link shown on a screen.
const QUIET = 4

export default function QrCode({ text, label, className }: { text: string, label: string, className?: string }) {
  const code = qrcode(0, 'L')
  code.addData(text)
  code.make()
  const count = code.getModuleCount()

  // One path for every dark square.
  let path = ''
  for (let row = 0; row < count; row++) {
    for (let column = 0; column < count; column++) {
      if (code.isDark(row, column)) path += `M${column + QUIET} ${row + QUIET}h1v1h-1z`
    }
  }

  const size = count + QUIET * 2
  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect width={size} height={size} fill="#f6e4b0" />
      <path d={path} fill="#1a1226" />
    </svg>
  )
}

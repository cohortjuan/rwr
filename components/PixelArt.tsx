// Draws tiny pixel art from a grid of strings ('#' is a filled pixel), so small decorations
// need no image files. Size comes from the --px CSS variable (one art pixel), colour from
// the current text colour.
export default function PixelArt({ rows, className }: { rows: string[], className?: string }) {
  const width = rows[0].length
  // One rectangle per horizontal run of filled pixels.
  const runs = rows.flatMap((row, y) =>
    [...row.matchAll(/#+/g)].map((run) => ({ x: run.index, y, length: run[0].length })),
  )
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${rows.length}`}
      style={{ width: `calc(var(--px) * ${width})`, height: `calc(var(--px) * ${rows.length})` }}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
    >
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.length} height={1} />
      ))}
    </svg>
  )
}

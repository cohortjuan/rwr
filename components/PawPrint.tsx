// Todah's signature: a paw print, drawn pixel by pixel. The same rows are used for the picture
// of the note (see lib/letterImage.ts), so the two always match.
export const pawRows = [
  '...XX.XX...',
  '...XX.XX...',
  'XX.......XX',
  'XX..XXX..XX',
  '...XXXXX...',
  '..XXXXXXX..',
  '..XXXXXXX..',
  '..XXX.XXX..',
  '...X...X...',
]

export default function PawPrint({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${pawRows[0].length} ${pawRows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      fill="currentColor"
    >
      {pawRows.flatMap((row, y) =>
        [...row.matchAll(/X+/g)].map((run) => (
          <rect key={`${y}-${run.index}`} x={run.index} y={y} width={run[0].length} height={1} />
        )),
      )}
    </svg>
  )
}

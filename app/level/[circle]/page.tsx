import { notFound } from 'next/navigation'
import LevelQuest from '@/components/LevelQuest'
import { liveLevels, type LiveLevel } from '@/lib/levels'

// One level of the interview, such as /level/heart. Add ?demo=1 to play it from the script
// with zero AI calls.
export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ circle: string }>
  searchParams: Promise<{ demo?: string }>
}) {
  const { circle } = await params
  const { demo } = await searchParams
  if (!liveLevels.includes(circle as LiveLevel)) notFound()
  return <LevelQuest circle={circle as LiveLevel} demo={demo === '1'} />
}

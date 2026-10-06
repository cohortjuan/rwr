import OnboardingQuest from '@/components/OnboardingQuest'

// /quest?demo=1 plays the quest from the script with zero AI calls.
export default async function QuestPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams
  return <OnboardingQuest demo={demo === '1'} />
}

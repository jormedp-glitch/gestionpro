import NegocioApp from '@/components/NegocioApp'

export default function NegocioPage({ params }: { params: Promise<{ slug: string }> }) {
  return <NegocioApp params={params} />
}
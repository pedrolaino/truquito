import { ChevronLeft } from 'lucide-react'
import { GuideContent } from './Guide.tsx'

export function GuidePage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <main className="page guide-page">
      <button type="button" className="back" onClick={() => navigate('/aprender')}>
        <ChevronLeft aria-hidden="true" /> Aprender
      </button>
      <h1 className="page-title">Guía rápida</h1>
      <GuideContent page />
    </main>
  )
}

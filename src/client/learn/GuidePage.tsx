import { ChevronLeft } from 'lucide-react'
import { Link } from '../Link.tsx'
import { GuideContent } from './Guide.tsx'

export function GuidePage() {
  return (
    <main className="page guide-page">
      <Link className="back" href="/aprender">
        <ChevronLeft aria-hidden="true" /> Aprender
      </Link>
      <h1 className="page-title">Guía rápida</h1>
      <GuideContent page />
    </main>
  )
}

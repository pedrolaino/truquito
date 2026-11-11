import { useCallback, useState } from 'react'
import { saveLessonTime, saveLessons, savedLessonTime, savedLessons } from '../storage.ts'
import { GuidePage } from './GuidePage.tsx'
import { HelperGame } from './HelperGame.tsx'
import { LearnHub } from './LearnHub.tsx'
import { LessonScreen } from './LessonScreen.tsx'
import { LESSONS } from './lessons.tsx'

const known = new Set(LESSONS.map((l) => l.id))

/** Everything under /aprender. */
export function Learn({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [done, setDone] = useState(() => new Set(savedLessons().filter((id) => known.has(id))))
  const id = path.replace(/^\/aprender\/?/, '')
  const index = LESSONS.findIndex((l) => l.id === id)
  const lesson = LESSONS[index]

  const finish = useCallback(() => {
    if (!lesson) return
    saveLessonTime(Date.now())
    setDone((current) => {
      if (current.has(lesson.id)) return current
      const next = new Set(current).add(lesson.id)
      saveLessons([...next])
      return next
    })
  }, [lesson])

  if (id === 'guia') return <GuidePage navigate={navigate} />
  if (id === 'ayudante') return <HelperGame onExit={() => navigate('/aprender')} />
  if (!lesson)
    return (
      <LearnHub lessons={LESSONS} done={done} lastTime={savedLessonTime()} navigate={navigate} />
    )
  const next = LESSONS[index + 1] ?? null
  return (
    <LessonScreen
      key={lesson.id}
      lesson={lesson}
      number={index + 1}
      doneCount={done.size + (done.has(lesson.id) ? 0 : 1)}
      total={LESSONS.length}
      next={next}
      onFinish={finish}
      onExit={() => navigate('/aprender')}
      onNext={() => navigate(next ? `/aprender/${next.id}` : '/aprender/ayudante')}
    />
  )
}

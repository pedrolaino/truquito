import { useEffect, useState } from 'react'
import type { Level } from '../bots/index.ts'
import type { GameConfig } from '../engine/game.ts'
import { BotMatch } from './BotMatch.tsx'
import { Home } from './Home.tsx'
import { Learn } from './learn/Learn.tsx'
import { OnlineRoom } from './OnlineRoom.tsx'
import { Scorekeeper } from './Scorekeeper.tsx'

export function App() {
  const [path, setPath] = useState(location.pathname)
  const [bot, setBot] = useState<{ level: Level; config: GameConfig } | null>(null)

  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string) => {
    history.pushState(null, '', to)
    setPath(to)
  }

  const room = path.match(/^\/r\/([0-9a-f]{32})$/)
  if (room) return <OnlineRoom key={room[1]} roomId={room[1]!} navigate={navigate} />
  if (path === '/anotador') return <Scorekeeper onExit={() => navigate('/')} />
  if (path === '/aprender' || path.startsWith('/aprender/'))
    return <Learn path={path} navigate={navigate} />
  if (path !== '/')
    return (
      <main className="page">
        <h1 className="page-title">Truquito</h1>
        <p role="alert" className="alert">
          Esta página no existe.
        </p>
        <a className="btn" href="/">
          Volver al inicio
        </a>
      </main>
    )
  if (bot) return <BotMatch {...bot} onExit={() => setBot(null)} />
  return <Home navigate={navigate} onPlayBot={(level, config) => setBot({ level, config })} />
}

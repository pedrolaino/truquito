import { useEffect, useRef, useState } from 'react'
import { BotMatch } from './BotMatch.tsx'
import { Home } from './Home.tsx'
import { Learn } from './learn/Learn.tsx'
import { OnlineRoom } from './OnlineRoom.tsx'
import { Scorekeeper } from './Scorekeeper.tsx'

export function App() {
  return (
    <>
      <a
        className="btn skip-link"
        href="#main-content"
        onClick={(event) => {
          const main = document.querySelector('main')
          if (main) {
            event.preventDefault()
            main.tabIndex = -1
            main.focus()
          }
        }}
      >
        Ir al contenido
      </a>
      <Routes />
    </>
  )
}

const currentRoute = () => location.pathname + location.search

function Routes() {
  const [route, setRoute] = useState(currentRoute)
  const path = route.split('?')[0]!
  const previousPath = useRef(path)
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) {
      main.id = 'main-content'
      main.tabIndex = -1
    }
    const title =
      path === '/jugar'
        ? 'Contra el bot'
        : document.querySelector('main h1')?.getAttribute('data-page-title') ||
          document.querySelector('main h1')?.textContent?.trim() ||
          'Truquito'
    document.title = title === 'Truquito' ? title : `${title} · Truquito`
    if (previousPath.current !== path) {
      const heading = document.querySelector<HTMLElement>('main h1')
      heading?.setAttribute('tabindex', '-1')
      ;(heading ?? main)?.focus({ preventScroll: true })
      if (!location.hash) window.scrollTo(0, 0)
      previousPath.current = path
    }
  }, [path])

  useEffect(() => {
    const onPop = () => setRoute(currentRoute())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string) => {
    history.pushState(null, '', to)
    setRoute(currentRoute())
  }

  const room = path.match(/^\/r\/([0-9a-f]{32})$/)
  if (room) return <OnlineRoom key={room[1]} roomId={room[1]!} />
  if (path === '/anotador') return <Scorekeeper />
  if (path === '/aprender' || path.startsWith('/aprender/'))
    return <Learn path={path} navigate={navigate} />
  if (path === '/jugar') {
    const params = new URLSearchParams(location.search)
    const level = params.get('level')
    return (
      <BotMatch
        key={route}
        level={level === 'easy' || level === 'hard' ? level : 'medium'}
        config={{
          flor: params.get('flor') === '1',
          target: params.get('target') === '30' ? 30 : 15,
        }}
        onExit={() => navigate('/')}
      />
    )
  }
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
  return (
    <Home
      navigate={navigate}
      onPlayBot={(level, config) =>
        navigate(`/jugar?level=${level}&target=${config.target}&flor=${config.flor ? '1' : '0'}`)
      }
    />
  )
}

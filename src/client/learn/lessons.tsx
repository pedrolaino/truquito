import type { Card } from '../../engine/cards.ts'
import { CardView } from '../Card.tsx'
import { Fosforos } from '../Fosforos.tsx'
import type { Action, GameEvent, GameState } from '../../engine/game.ts'
import type { Lesson } from './lesson.ts'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const play = (card: Card): Action => ({ type: 'play', card })
const ENVIDO: Action = { type: 'envido', call: 'envido' }
const REAL_ENVIDO: Action = { type: 'envido', call: 'realEnvido' }
const TRUCO: Action = { type: 'truco' }
const QUIERO: Action = { type: 'quiero' }
const NO_QUIERO: Action = { type: 'noQuiero' }

const envidoScored = (_: unknown, events: GameEvent[]) =>
  events.some((e) => e.type === 'score' && e.reason === 'envido')
const roundOver = (_: unknown, events: GameEvent[]) => events.some((e) => e.type === 'roundEnd')
const firstTrickDone = (state: GameState) => state.round.tricks[0]!.winner !== null

/** How a practice hand ended, from the score. */
const practiceDone = (state: GameState) =>
  state.scores[0]! > state.scores[1]!
    ? `Ganaste la mano y sumaste ${state.scores[0]}.`
    : `Esta vez ganó el rival y sumó ${state.scores[1]}. Podés jugar otra mano.`

/** The stages of the path, in order; each lesson names its own. */
export const STAGES = [
  'Tu primera mano',
  'Elegí qué carta tirar',
  'Cantá truco',
  'Sumá con el envido',
  'Seguí practicando',
]

function Cards({ cards, labels }: { cards: Card[]; labels?: string[] }) {
  return (
    <div className="lesson-cards">
      {cards.map((card, i) => (
        <figure key={i} className="lesson-card">
          <CardView card={card} />
          {labels?.[i] && <figcaption>{labels[i]}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

const TRICK_NAMES = ['Primera', 'Segunda', 'Tercera']

/** Tricks already played, your card next to the rival's, without saying who won. */
function Tricks({ tricks }: { tricks: [Card, Card][] }) {
  return (
    <ol className="lesson-tricks">
      {tricks.map(([mine, theirs], i) => (
        <li key={i}>
          <span className="lesson-tricks-name">{TRICK_NAMES[i]}</span>
          <figure className="lesson-card">
            <CardView card={mine} />
            <figcaption>Vos</figcaption>
          </figure>
          <figure className="lesson-card">
            <CardView card={theirs} />
            <figcaption>Rival</figcaption>
          </figure>
        </li>
      ))}
    </ol>
  )
}

/** An envido chain as a short conversation, with what it is worth after each call. */
function Chain({ lines, end }: { lines: [string, string, number][]; end?: string }) {
  return (
    <ol className="chain">
      {lines.map(([who, call, value], i) => (
        <li key={i} className={i === lines.length - 1 && !end ? 'is-last' : undefined}>
          <b>{who}:</b> {call} <span className="chain-value">si se acepta, {value}</span>
        </li>
      ))}
      {end && <li className="is-last chain-end">{end}</li>}
    </ol>
  )
}

export const LESSONS: Lesson[] = [
  {
    id: 'objetivo',
    title: 'Jugá tu primera mano',
    summary: 'Tres cartas y tu primer punto',
    stage: 0,
    guide: 'cartas',
    outro: 'Jugaste tu primera mano y sumaste un punto. Ahora: qué carta tirar.',
    steps: [
      {
        kind: 'play',
        title: 'Tu primera mano',
        play: {
          hands: [
            [c(3, 'copa'), c(5, 'oro'), c(11, 'basto')],
            [c(12, 'oro'), c(6, 'espada'), c(4, 'copa')],
          ],
          mano: 0,
          rival: [play(c(12, 'oro')), play(c(4, 'copa'))],
          cues: [
            {
              say: 'Te repartimos tres cartas y empezás vos: sos mano. Tirá el 3 de copa.',
              expect: play(c(3, 'copa')),
            },
            {
              say: 'En el truco, el 3 le gana al 12: ganaste la primera. Tirá cualquiera: si ganás otra, la mano es tuya.',
              expect: play(c(5, 'oro')),
              or: [play(c(11, 'basto'))],
            },
          ],
          goal: roundOver,
          done: 'Ganaste dos de las tres: la mano es tuya y sumás 1 punto.',
        },
      },
      {
        kind: 'say',
        title: 'Ese punto es un fósforo',
        text: 'Los puntos se anotan con fósforos. Cuatro forman un cuadrado y el quinto lo cruza: cada cuadrado son 5 puntos.',
        visual: <Fosforos points={5} target={15} big />,
      },
      {
        kind: 'say',
        title: 'Gana el primero que llega a 15',
        text: 'Acá practicamos uno contra uno, a 15 y sin flor.',
        visual: <Fosforos points={15} target={15} big />,
        more: [
          'Otros formatos',
          'También se juega en parejas o de a tres por equipo, a 30 puntos o con flor. Las reglas son las mismas, y la flor tiene una lección aparte.',
        ],
      },
      {
        kind: 'say',
        title: 'Cuánto vale una mano',
        text: 'La mano vale 1. Con truco querido pasa a valer 2. El envido se cuenta aparte.',
        rows: [
          ['Sin cantos', '1 punto'],
          ['Con truco querido', '2 puntos, y más si se sube'],
          ['Envido', 'Aparte de la mano: 2 puntos o más'],
        ],
      },
      {
        kind: 'choose',
        prompt: 'Si nadie canta nada, ¿cuánto vale ganar una mano?',
        options: ['1 punto', '2 puntos', 'Nada'],
        answer: 0,
        explain: 'Ganar la mano da 1 punto. El truco y el envido son apuestas para sumar más.',
        wrong: {
          '1': 'Los 2 puntos son con truco querido, y acá nadie cantó. Probá otra vez.',
          '2': 'Ganar la mano siempre da algo, aunque nadie cante. Probá otra vez.',
        },
      },
    ],
  },
  {
    id: 'cartas',
    title: 'Qué carta le gana a cuál',
    summary: 'La escala, por grupos',
    stage: 1,
    guide: 'cartas',
    outro: 'Viste la escala por grupos. Ahora: cómo se gana una mano eligiendo qué tirar.',
    steps: [
      {
        kind: 'say',
        title: 'Cuarenta cartas, cuatro palos',
        text: 'Se juega con la baraja española: espada, basto, oro y copa, del 1 al 12 sin 8 ni 9. En el truco no gana el número más alto: hay una escala propia, y la vas a ver por grupos.',
        visual: <Cards cards={[c(1, 'espada'), c(1, 'basto'), c(1, 'oro'), c(1, 'copa')]} />,
      },
      {
        kind: 'say',
        title: 'Las cuatro más fuertes',
        text: 'Arriba de todo están estas cuatro, de mayor a menor. Al 1 de espada se le dice ancho de espada, y al 1 de basto, ancho de basto.',
        visual: (
          <Cards
            cards={[c(1, 'espada'), c(1, 'basto'), c(7, 'espada'), c(7, 'oro')]}
            labels={['1.º', '2.º', '3.º', '4.º']}
          />
        ),
      },
      {
        kind: 'whichWins',
        a: c(7, 'espada'),
        b: c(1, 'basto'),
        explain: 'El ancho de basto es la segunda carta más fuerte: le gana al siete de espada.',
        wrong: {
          a: 'El 7 de espada es la tercera más fuerte, y hay una más arriba en la mesa. Probá otra vez.',
          tie: 'Son de distinto nivel: una le gana a la otra. Probá otra vez.',
        },
      },
      {
        kind: 'say',
        title: 'Después, los 3 y los 2',
        text: 'Siguen todos los 3, después todos los 2, y después los anchos falsos: el 1 de oro y el 1 de copa.',
        visual: (
          <Cards
            cards={[c(3, 'copa'), c(2, 'basto'), c(1, 'oro')]}
            labels={['Los 3', 'Los 2', 'Anchos falsos']}
          />
        ),
      },
      {
        kind: 'whichWins',
        a: c(1, 'oro'),
        b: c(3, 'basto'),
        explain: 'El 1 de oro es un ancho falso: cualquier 3 le gana.',
        wrong: {
          a: 'El 1 de oro no es uno de los anchos de arriba: es un ancho falso. Probá otra vez.',
          tie: 'Un 3 y un ancho falso no están en el mismo nivel. Probá otra vez.',
        },
      },
      {
        kind: 'strongest',
        cards: [c(2, 'espada'), c(1, 'copa'), c(3, 'oro')],
        explain: 'Los 3 están arriba de los 2, y los 2 arriba de los anchos falsos.',
        wrong: {
          '2 de espada': 'Los 2 son fuertes, pero hay un grupo más arriba. Probá otra vez.',
          '1 de copa':
            'El 1 de copa es un ancho falso: está abajo de los 3 y los 2. Probá otra vez.',
        },
      },
      {
        kind: 'say',
        title: 'Las negras y las más bajas',
        text: 'Después vienen el 12, el 11 y el 10, que se llaman las negras. Abajo de todo, los sietes falsos (basto y copa), el 6, el 5 y el 4.',
        visual: (
          <Cards
            cards={[c(12, 'oro'), c(7, 'copa'), c(4, 'espada')]}
            labels={['Negras', 'Sietes falsos', 'El 4, la más baja']}
          />
        ),
      },
      {
        kind: 'whichWins',
        a: c(7, 'copa'),
        b: c(11, 'espada'),
        explain: 'El 7 de copa es un siete falso: vale menos que cualquier negra.',
        wrong: {
          a: 'El 7 de copa no es de los sietes de arriba: es un siete falso. Probá otra vez.',
          tie: 'Las negras y los sietes falsos están en niveles distintos. Probá otra vez.',
        },
      },
      {
        kind: 'order',
        cards: [c(12, 'copa'), c(5, 'basto'), c(2, 'oro')],
        explain: 'Primero el 2, después la negra y abajo de todo el 5.',
      },
      {
        kind: 'say',
        title: 'Si empatan, es parda',
        text: 'Dos cartas del mismo nivel, como dos 3, empatan. Eso se llama parda.',
        visual: <Cards cards={[c(3, 'oro'), c(3, 'espada')]} />,
      },
      {
        kind: 'whichWins',
        a: c(2, 'espada'),
        b: c(2, 'oro'),
        explain: 'Los dos son 2: el palo no importa, es parda.',
        wrong: {
          a: 'Fijate el número: los dos son 2, y en los 2 el palo no cambia nada. Probá otra vez.',
          b: 'Fijate el número: los dos son 2, y en los 2 el palo no cambia nada. Probá otra vez.',
        },
      },
      {
        kind: 'say',
        title: 'No hace falta acordarse de toda la escala',
        text: 'La podés consultar mientras jugás, con el botón ? de arriba.',
      },
    ],
  },
  {
    id: 'ronda',
    title: 'Ganate la mano',
    summary: 'Bazas, turnos y qué carta tirar',
    stage: 1,
    guide: 'cartas',
    outro: 'Ganaste bazas eligiendo vos qué tirar. Ahora: qué pasa cuando empatan.',
    steps: [
      {
        kind: 'say',
        title: 'Tres bazas',
        text: 'Cada uno tira una carta: eso es una baza, y se la lleva la más fuerte. En la mesa se les dice primera, segunda y tercera. Dos bazas ganan la mano.',
        visual: <Cards cards={[c(3, 'copa'), c(12, 'copa')]} labels={['Vos', 'El rival']} />,
      },
      {
        kind: 'say',
        title: 'Quién empieza',
        text: 'Empieza el mano. Después de cada baza empieza el que la ganó, y en la mano siguiente el mano es el otro.',
      },
      {
        kind: 'play',
        title: 'Ganale al 12',
        play: {
          hands: [
            [c(3, 'copa'), c(1, 'espada'), c(4, 'oro')],
            [c(12, 'oro'), c(5, 'basto'), c(6, 'copa')],
          ],
          mano: 1,
          rival: [play(c(12, 'oro'))],
          cues: [
            {
              say: 'El rival tiró un 12. Ganale y guardá tu carta más fuerte.',
              expect: play(c(3, 'copa')),
              free: {
                hint: 'El 3 ya le gana al 12, y el ancho te queda para después.',
                replies: [
                  {
                    action: play(c(3, 'copa')),
                    say: 'Ganaste con el 3 y conservaste el ancho de espada.',
                  },
                  {
                    action: play(c(1, 'espada')),
                    say: 'También ganás esta baza. El 3 alcanzaba para ganarle al 12 y te permitía guardar el ancho.',
                  },
                  {
                    action: play(c(4, 'oro')),
                    say: 'El 12 le gana al 4. Probá con una carta que esté más arriba en la escala.',
                    retry: true,
                  },
                ],
              },
            },
          ],
          goal: firstTrickDone,
          done: 'La más baja que gana alcanza: así guardás las buenas para las bazas que quedan.',
        },
      },
      {
        kind: 'say',
        title: 'Si no podés ganarle',
        text: 'Si ninguna de tus cartas le gana, tirá la más baja y guardá las fuertes para las otras bazas.',
      },
      {
        kind: 'play',
        title: 'Guardá las buenas',
        play: {
          hands: [
            [c(7, 'oro'), c(4, 'basto'), c(2, 'copa')],
            [c(7, 'espada'), c(6, 'oro'), c(5, 'copa')],
          ],
          mano: 1,
          rival: [play(c(7, 'espada')), play(c(5, 'copa')), play(c(6, 'oro'))],
          cues: [
            {
              say: 'El rival tiró el 7 de espada. ¿Qué tirás?',
              expect: play(c(4, 'basto')),
              free: {
                hint: 'El 7 de espada le gana a todas tus cartas: tirá la más baja.',
                replies: [
                  {
                    action: play(c(4, 'basto')),
                    say: 'No le ganabas con ninguna: tiraste la más baja y guardaste las buenas.',
                  },
                  {
                    action: play(c(2, 'copa')),
                    say: 'El 7 de espada le gana al 2, así que lo perdés sin ganar nada. Probá con otra.',
                    retry: true,
                  },
                  {
                    action: play(c(7, 'oro')),
                    say: 'El 7 de espada le gana al 7 de oro, así que lo perdés sin ganar nada. Probá con otra.',
                    retry: true,
                  },
                ],
              },
            },
            {
              say: 'Ganó el rival y empieza: tiró el 5 de copa. Ganale.',
              expect: play(c(2, 'copa')),
              free: {
                hint: 'El 2 ya le gana al 5, y el 7 de oro te queda para la tercera.',
                replies: [
                  {
                    action: play(c(2, 'copa')),
                    say: 'Ganaste con el 2 y te guardaste el 7 de oro.',
                  },
                  {
                    action: play(c(7, 'oro')),
                    say: 'También gana, pero el 2 alcanzaba y te guardabas el 7.',
                  },
                ],
              },
            },
            {
              say: 'Una baza cada uno: la tercera define. Tirá tu última carta.',
              expect: play(c(7, 'oro')),
              or: [play(c(2, 'copa'))],
            },
          ],
          goal: roundOver,
          done: (state) =>
            state.previous?.tricks[2]?.cards[0]?.rank === 7
              ? 'Guardaste el 7 de oro y ganaste la tercera.'
              : 'Ganaste la segunda y la tercera: la mano es tuya.',
        },
      },
      {
        kind: 'play',
        title: 'Una mano entera',
        hint: 'Esta mano es al azar y sin cantos. Si te trabás, pedí una pista.',
        play: {
          mano: 0,
          rival: [],
          cues: [],
          practice: 'none',
          goal: roundOver,
          done: practiceDone,
        },
      },
    ],
  },
  {
    id: 'pardas',
    title: 'Cuando empatan',
    summary: 'Las pardas',
    stage: 1,
    guide: 'cartas',
    outro: 'Ya sabés qué pasa con una parda en la primera. Ahora: el truco.',
    steps: [
      {
        kind: 'say',
        title: 'Parda: nadie gana la baza',
        text: 'Si las dos cartas empatan, la baza no es de nadie y la siguiente la empieza el mano.',
        visual: <Cards cards={[c(3, 'copa'), c(3, 'basto')]} />,
      },
      {
        kind: 'say',
        title: 'Parda la primera',
        text: 'Si la primera es parda, el que gana la segunda se lleva la mano.',
      },
      {
        kind: 'play',
        title: 'Probalo',
        play: {
          hands: [
            [c(3, 'copa'), c(7, 'espada'), c(4, 'oro')],
            [c(3, 'basto'), c(1, 'oro'), c(5, 'copa')],
          ],
          mano: 0,
          rival: [play(c(3, 'basto')), play(c(1, 'oro'))],
          cues: [
            { say: 'Sos mano. Tirá el 3 de copa.', expect: play(c(3, 'copa')) },
            {
              say: 'Parda la primera: la segunda define la mano, y empezás vos por ser mano. Tirá el 7 de espada.',
              expect: play(c(7, 'espada')),
            },
          ],
          goal: roundOver,
          done: 'Con la primera parda, ganar la segunda te dio la mano.',
        },
      },
      {
        kind: 'choose',
        prompt: '¿Quién ganó esta mano?',
        visual: (
          <Tricks
            tricks={[
              [c(2, 'espada'), c(2, 'copa')],
              [c(12, 'oro'), c(3, 'basto')],
            ]}
          />
        ),
        options: ['Vos', 'El rival', 'Nadie todavía'],
        answer: 1,
        explain: 'La primera fue parda, y la segunda la ganó el rival con el 3: la mano es suya.',
        wrong: {
          '0': 'Fijate la segunda: el 3 le gana al 12. Probá otra vez.',
          '2': 'Con la primera parda, la segunda ya define. Probá otra vez.',
        },
      },
      {
        kind: 'choose',
        prompt: '¿Qué baza definió esa mano?',
        visual: (
          <Tricks
            tricks={[
              [c(2, 'espada'), c(2, 'copa')],
              [c(12, 'oro'), c(3, 'basto')],
            ]}
          />
        ),
        options: ['La primera', 'La segunda', 'La tercera'],
        answer: 1,
        explain: 'La primera fue parda, así que definió la segunda. La tercera ni se jugó.',
      },
    ],
  },
  {
    id: 'truco',
    title: 'Cantá truco',
    summary: 'Quiero, no quiero y tu primera mentira',
    stage: 2,
    guide: 'cantos',
    outro: 'Cantaste, respondiste y mentiste con el truco. Ahora: el envido.',
    steps: [
      {
        kind: 'say',
        title: 'Te cantaron truco',
        text: 'Si no querés, perdés 1. ¿Y si aceptás? El truco es una apuesta: en tu turno, antes de tirar, lo podés cantar, y si te lo quieren la mano pasa a valer 2.',
      },
      {
        kind: 'say',
        title: 'Las respuestas',
        text: 'Cuando te cantan truco, respondés:',
        rows: [
          ['Quiero', 'Se juega la mano por 2 puntos.'],
          ['No quiero', 'El que cantó se lleva 1 punto y la mano termina.'],
        ],
        more: [
          'Y se puede subir',
          'También podés responder con retruco, que sube la apuesta. Eso se ve más adelante.',
        ],
      },
      {
        kind: 'play',
        title: 'Cantá truco',
        play: {
          hands: [
            [c(1, 'espada'), c(1, 'basto'), c(4, 'copa')],
            [c(5, 'oro'), c(6, 'copa'), c(12, 'basto')],
          ],
          mano: 0,
          rival: [QUIERO, play(c(5, 'oro')), play(c(6, 'copa'))],
          cues: [
            { say: 'Tenés los dos anchos. Cantá truco.', expect: TRUCO },
            {
              say: 'Te lo quisieron: la mano vale 2. Tirá el ancho de espada.',
              expect: play(c(1, 'espada')),
            },
            { say: 'Tirá el ancho de basto y llevate la mano.', expect: play(c(1, 'basto')) },
          ],
          goal: roundOver,
          done: 'Ganaste la mano con el truco querido: sumaste 2 puntos.',
        },
      },
      {
        kind: 'play',
        title: 'Te cantan truco',
        play: {
          hands: [
            [c(4, 'oro'), c(5, 'copa'), c(6, 'espada')],
            [c(1, 'espada'), c(7, 'oro'), c(3, 'copa')],
          ],
          mano: 1,
          rival: [TRUCO],
          cues: [
            {
              say: 'Te cantaron truco y tenés un 4, un 5 y un 6. ¿Qué respondés?',
              expect: NO_QUIERO,
              free: {
                hint: 'Con esas cartas es difícil ganar: si no lo querés, perdés 1 y no 2.',
                replies: [
                  {
                    action: NO_QUIERO,
                    say: 'El rival sumó 1 punto en vez de 2. Saber no querer es tan importante como saber cantar.',
                  },
                  {
                    action: QUIERO,
                    say: 'Si lo querés, se juega por 2 con un 4, un 5 y un 6: lo más probable es perder 2. Probá la otra respuesta.',
                    retry: true,
                  },
                ],
              },
            },
          ],
          goal: roundOver,
          done: 'Cuando tus cartas no alcanzan, decir No quiero cuesta menos.',
        },
      },
      {
        kind: 'say',
        title: 'En el truco se miente',
        text: 'Nadie ve tus cartas. Podés cantar truco con cartas malas para que el otro crea que tenés buenas y no te lo quiera.',
      },
      {
        kind: 'play',
        title: 'Mentí con el truco',
        play: {
          hands: [
            [c(4, 'copa'), c(5, 'basto'), c(6, 'oro')],
            [c(5, 'oro'), c(6, 'espada'), c(11, 'copa')],
          ],
          mano: 0,
          rival: [NO_QUIERO],
          cues: [
            {
              say: 'Tus cartas son malas, pero el rival no lo sabe. Cantá truco.',
              expect: TRUCO,
            },
          ],
          goal: roundOver,
          done: 'El rival no te lo quiso: te llevaste 1 punto con un 4, un 5 y un 6.',
        },
      },
      {
        kind: 'play',
        title: 'A veces te lo quieren',
        play: {
          hands: [
            [c(4, 'copa'), c(5, 'basto'), c(6, 'oro')],
            [c(3, 'copa'), c(7, 'oro'), c(12, 'espada')],
          ],
          mano: 0,
          rival: [QUIERO, play(c(3, 'copa')), play(c(7, 'oro'))],
          cues: [
            { say: 'Otra mano mala. Volvé a mentir: cantá truco.', expect: TRUCO },
            {
              say: 'Te lo quisieron: ahora la mano vale 2 y hay que jugarla. Tirá una carta.',
              expect: play(c(6, 'oro')),
              or: [play(c(4, 'copa')), play(c(5, 'basto'))],
            },
            {
              say: 'Tirá otra.',
              expect: play(c(5, 'basto')),
              or: [play(c(4, 'copa')), play(c(6, 'oro'))],
            },
          ],
          goal: roundOver,
          done: 'Esta vez te lo quisieron y el rival ganó: se llevó 2. Mentir puede salir bien o mal.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaste truco y te dijeron No quiero. ¿Cuántos puntos sumás?',
        options: ['1', '2', '3'],
        answer: 0,
        explain: 'Si no te quieren el truco, sumás lo que valía la mano antes: 1 punto.',
        wrong: {
          '1': 'Los 2 puntos son si te lo quieren y ganás. Probá otra vez.',
          '2': '3 es el retruco. Acá solo cantaste truco. Probá otra vez.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaste truco mintiendo y te dijeron Quiero. ¿Qué pasa?',
        options: ['Se juega la mano por 2', 'Te llevás 1 punto igual', 'Se reparte de nuevo'],
        answer: 0,
        explain:
          'Si te quieren la mentira, se juega por 2 y tenés que ganarla con tus cartas. Por eso es arriesgado.',
        wrong: {
          '1': 'El punto sin jugar es cuando te dicen No quiero. Probá otra vez.',
          '2': 'La mano sigue con las mismas cartas. Probá otra vez.',
        },
      },
      {
        kind: 'play',
        title: 'Práctica de truco, sin envido',
        hint: 'Mano al azar: podés cantar truco, querer o no querer. Sin envido.',
        play: {
          mano: 1,
          rival: [],
          cues: [],
          practice: 'truco',
          goal: roundOver,
          done: practiceDone,
        },
      },
    ],
  },
  {
    id: 'contar-envido',
    title: 'Contá el envido',
    summary: 'Cuántos puntos tenés',
    stage: 3,
    guide: 'envido',
    outro: 'Practicaste cómo contar el envido. Ahora vamos a cantarlo.',
    steps: [
      {
        kind: 'say',
        title: 'Una apuesta aparte',
        text: 'El envido se juega al principio de la mano, aparte de las bazas: gana el que tiene más puntos de envido en sus cartas.',
      },
      {
        kind: 'say',
        title: 'Dos del mismo palo',
        text: 'Si tenés dos cartas del mismo palo, valen 20 más sus números. Acá: 20 + 7 + 5 = 32.',
        visual: <Cards cards={[c(7, 'oro'), c(5, 'oro')]} />,
      },
      {
        kind: 'say',
        title: 'Las negras valen 0',
        text: 'Al 10, al 11 y al 12 se les dice las negras, y para el envido no suman. Acá: 20 + 0 + 6 = 26.',
        visual: <Cards cards={[c(12, 'espada'), c(6, 'espada')]} />,
      },
      {
        kind: 'say',
        title: 'Sin dos del mismo palo',
        text: 'Vale tu carta más alta, pero las negras siguen valiendo 0. Acá el 11 no cuenta y tenés 7.',
        visual: <Cards cards={[c(4, 'basto'), c(7, 'copa'), c(11, 'oro')]} />,
      },
      {
        kind: 'count',
        pick: true,
        hand: [c(6, 'copa'), c(3, 'copa'), c(1, 'espada')],
        options: [9, 29, 23],
        explain: 'El 6 y el 3 son de copa.',
        praise: 'Con dos del mismo palo, sumás sus valores y agregás 20.',
        hint: 'Podés consultar la regla del envido en la Guía rápida.',
        wrong: {
          '9': 'Sumaste las dos cartas. Como son del mismo palo, también se agregan 20. Probá otra vez.',
          '23': 'Contaste el 3 pero te faltó el 6: se suman las dos del mismo palo. Probá otra vez.',
        },
      },
      {
        kind: 'count',
        hand: [c(10, 'oro'), c(4, 'oro'), c(7, 'basto')],
        options: [24, 7, 14],
        explain: 'El 10 y el 4 son de oro, y el 10 es negra: vale 0.',
        wrong: {
          '7': 'El 10 y el 4 son del mismo palo: eso ya da 20. Probá otra vez.',
          '14': 'El 10 es negra: vale 0, no 10. Probá otra vez.',
        },
      },
      {
        kind: 'count',
        pick: true,
        hand: [c(2, 'espada'), c(5, 'basto'), c(12, 'copa')],
        options: [25, 12, 5],
        explain: 'No hay dos del mismo palo: vale la más alta para el envido, y el 12 es negra.',
        wrong: {
          '25': 'No hay dos del mismo palo, así que no se suma 20. Probá otra vez.',
          '12': 'El 12 es negra: vale 0. Probá otra vez.',
        },
      },
      {
        kind: 'say',
        title: 'Tres del mismo palo',
        text: 'Si juegan sin flor y te tocan tres del mismo palo, contás las dos mejores. Acá: 20 + 7 + 5 = 32, y el 2 no cuenta.',
        visual: <Cards cards={[c(7, 'copa'), c(5, 'copa'), c(2, 'copa')]} />,
      },
      {
        kind: 'count',
        pick: true,
        hand: [c(6, 'basto'), c(4, 'basto'), c(1, 'basto')],
        options: [31, 30, 11],
        explain: 'Las tres son de basto: cuentan las dos mejores, el 6 y el 4.',
        wrong: {
          '31': 'Con tres del mismo palo cuentan solo las dos mejores. Probá otra vez.',
          '11': 'Son del mismo palo: se agregan 20. Probá otra vez.',
        },
      },
      {
        kind: 'say',
        title: 'Las negras juntas',
        text: 'Las negras valen 0, pero si dos son del mismo palo el 20 se suma igual.',
        visual: <Cards cards={[c(12, 'oro'), c(11, 'oro')]} />,
        rows: [
          ['Dos negras del mismo palo', '20'],
          ['Tres negras de distinto palo', '0'],
        ],
      },
      {
        kind: 'count',
        hand: [c(7, 'espada'), c(6, 'espada'), c(1, 'basto')],
        options: [34, 33, 13],
        explain: 'Es lo máximo que se puede tener. Si el otro también tiene 33, gana el mano.',
        wrong: {
          '34': 'Se suman 20, el 7 y el 6. Probá otra vez.',
          '13': 'Son del mismo palo: se agregan 20. Probá otra vez.',
        },
      },
    ],
  },
  {
    id: 'cantar-envido',
    title: 'Cantá el envido',
    summary: 'Cantar, querer o no querer',
    stage: 3,
    guide: 'envido',
    helperAfter: true,
    outro:
      'Ya contaste, cantaste y respondiste el envido. Probalo en una partida con ayudante: también te explica los cantos que todavía no practicaste.',
    steps: [
      {
        kind: 'say',
        title: 'Cuándo se canta',
        text: 'En la primera baza, antes de tirar tu carta. Si te lo quieren, se juega por 2 puntos; si no, el que cantó se lleva 1.',
      },
      {
        kind: 'say',
        title: 'Cómo se compara',
        text: 'Si te lo quieren, el mano dice sus puntos primero. Si el otro no tiene más, dice Son buenas. Si empatan, gana el mano.',
      },
      {
        kind: 'play',
        title: 'Cantá envido',
        hint: 'Si te trabás con los cantos, el ? te muestra cuánto vale cada uno.',
        play: {
          hands: [
            [c(7, 'oro'), c(6, 'oro'), c(4, 'copa')],
            [c(5, 'espada'), c(2, 'basto'), c(11, 'copa')],
          ],
          mano: 0,
          rival: [QUIERO],
          cues: [{ say: 'Tenés 33, lo máximo. Cantá envido.', expect: ENVIDO }],
          goal: envidoScored,
          done: 'El rival tenía menos y dijo Son buenas: sumaste 2 puntos de envido.',
        },
      },
      {
        kind: 'play',
        title: 'Te cantan envido',
        play: {
          hands: [
            [c(4, 'oro'), c(6, 'copa'), c(12, 'basto')],
            [c(7, 'espada'), c(5, 'espada'), c(1, 'copa')],
          ],
          mano: 1,
          rival: [ENVIDO],
          cues: [
            {
              say: 'El rival cantó envido y vos tenés 6. ¿Qué respondés?',
              expect: NO_QUIERO,
              free: {
                hint: 'Con 6 casi cualquier mano te gana. Si no lo querés, el rival se lleva 1 y no 2.',
                replies: [
                  {
                    action: NO_QUIERO,
                    say: 'No lo quisiste: el rival se lleva 1 en vez de 2.',
                  },
                  {
                    action: QUIERO,
                    say: 'Lo quisiste con 6 y el rival tenía 32: se llevó 2. Con No quiero perdías 1.',
                  },
                ],
              },
            },
          ],
          goal: envidoScored,
          done: 'Responder también es elegir cuánto arriesgás.',
        },
      },
      {
        kind: 'play',
        title: 'Ganar el envido y perder la mano',
        play: {
          hands: [
            [c(7, 'copa'), c(6, 'copa'), c(4, 'basto')],
            [c(1, 'espada'), c(2, 'oro'), c(12, 'basto')],
          ],
          mano: 0,
          rival: [QUIERO, play(c(1, 'espada')), play(c(2, 'oro'))],
          cues: [
            { say: 'Tenés 33 de envido, pero cartas flojas. Cantá envido.', expect: ENVIDO },
            {
              say: 'Ganaste el envido. Ahora se juega la mano: tirá una carta.',
              expect: play(c(4, 'basto')),
              or: [play(c(6, 'copa')), play(c(7, 'copa'))],
            },
            {
              say: 'Tirá otra.',
              expect: play(c(6, 'copa')),
              or: [play(c(7, 'copa')), play(c(4, 'basto'))],
            },
          ],
          goal: roundOver,
          done: 'Vos +2 por el envido, el rival +1 por la mano. El envido y la mano se cuentan por separado.',
        },
      },
      {
        kind: 'say',
        title: 'El envido va primero',
        text: 'Si te cantan truco y todavía no tiraste, podés contestar con envido. Se juega el envido y después respondés el truco.',
      },
      {
        kind: 'play',
        title: 'Te cantan truco con 33',
        play: {
          hands: [
            [c(7, 'copa'), c(6, 'copa'), c(1, 'espada')],
            [c(4, 'oro'), c(5, 'basto'), c(12, 'espada')],
          ],
          mano: 1,
          rival: [TRUCO, QUIERO],
          cues: [
            {
              say: 'Te cantaron truco, pero tenés 33 y no tiraste: el envido va primero. Cantá envido.',
              expect: ENVIDO,
            },
            {
              say: 'Ganaste el envido. Ahora respondé el truco: con el ancho de espada, querelo.',
              expect: QUIERO,
            },
          ],
          goal: (state) => state.round.truco.level === 2,
          done: 'Sumaste el envido y aceptaste el truco: la mano vale 2.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaste envido y no te lo quisieron. ¿Cuánto sumás?',
        options: ['1', '2', 'Nada'],
        answer: 0,
        explain: 'Un envido no querido vale 1 para el que lo cantó.',
        wrong: {
          '1': 'Los 2 son si lo quieren y ganás. Probá otra vez.',
          '2': 'El que canta y no se lo quieren siempre suma algo. Probá otra vez.',
        },
      },
    ],
  },
  {
    id: 'truco-subir',
    title: 'Subí el truco',
    summary: 'Retruco, vale cuatro y el mazo',
    stage: 4,
    guide: 'cantos',
    outro: 'Ya sabés subir el truco y cuánto se cobra si no lo quieren.',
    steps: [
      {
        kind: 'say',
        title: 'Retruco y vale cuatro',
        text: 'La apuesta puede subir dos veces más, y solo sube el que dijo quiero.',
        rows: [
          ['Truco', 'La mano vale 2.'],
          ['Retruco', 'La mano vale 3.'],
          ['Vale cuatro', 'La mano vale 4.'],
        ],
      },
      {
        kind: 'play',
        title: 'Querelo y subí',
        play: {
          hands: [
            [c(1, 'espada'), c(1, 'basto'), c(7, 'espada')],
            [c(3, 'copa'), c(2, 'oro'), c(5, 'basto')],
          ],
          mano: 1,
          rival: [TRUCO, QUIERO],
          cues: [
            {
              say: 'Te cantaron truco y tenés las tres mejores. Querelo y subí: cantá retruco.',
              expect: TRUCO,
            },
          ],
          goal: (state) => state.round.truco.level === 3 && !state.round.truco.pending,
          done: 'Te quisieron el retruco: la mano vale 3.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaste retruco y te dijeron No quiero. ¿Cuánto sumás?',
        options: ['2', '3', '1'],
        answer: 0,
        explain: 'Te llevás lo que valía antes del retruco: el truco querido, 2.',
        wrong: {
          '1': '3 es si te lo quieren y ganás. Probá otra vez.',
          '2': 'Antes del retruco ya había un truco querido. Probá otra vez.',
        },
      },
      {
        kind: 'say',
        title: 'Me voy al mazo',
        text: 'En tu turno podés dejar la mano y el otro se lleva lo que valía. Sirve cuando sabés que perdés y no querés arriesgar más.',
      },
      {
        kind: 'say',
        title: 'Al 4 no se le canta truco',
        text: 'Es una regla de esta mesa: si el rival tiró un 4, no le podés cantar truco hasta que tires tu carta. En el juego vas a ver el botón apagado.',
        visual: <Cards cards={[c(4, 'basto')]} labels={['Lo que tiró el rival']} />,
      },
    ],
  },
  {
    id: 'envido-subir',
    title: 'Subí el envido',
    summary: 'Envido, real envido y falta envido',
    stage: 4,
    guide: 'envido',
    outro: 'Ya sabés subir el envido y cuánto se cobra en cada caso.',
    steps: [
      {
        kind: 'say',
        title: 'Subir el envido',
        text: 'Si te cantan envido, en vez de contestar quiero o no quiero podés subirlo.',
        rows: [
          ['Envido', 'Suma 2. Se puede cantar hasta dos veces seguidas.'],
          ['Real envido', 'Suma 3.'],
          ['Falta envido', 'Vale lo que le falta al que va ganando.'],
        ],
      },
      {
        kind: 'play',
        title: 'Envido y envido',
        play: {
          hands: [
            [c(7, 'espada'), c(5, 'espada'), c(10, 'copa')],
            [c(6, 'oro'), c(3, 'oro'), c(12, 'basto')],
          ],
          mano: 0,
          rival: [ENVIDO],
          cues: [
            { say: 'Tenés 32 de envido. Cantá envido.', expect: ENVIDO },
            {
              say: 'El rival lo subió con otro envido: si lo querés, se juegan 4. Con 32, querelo.',
              expect: QUIERO,
            },
          ],
          goal: envidoScored,
          done: 'Envido y envido querido: 2 + 2 = 4 para vos.',
        },
      },
      {
        kind: 'say',
        title: 'Se va sumando',
        text: 'Cada canto suma lo suyo. Si al final lo quieren, el que tiene más se lleva todo.',
        visual: (
          <Chain
            lines={[
              ['Vos', 'Envido', 2],
              ['Rival', 'Envido', 4],
              ['Vos', 'Real envido', 7],
            ]}
          />
        ),
      },
      {
        kind: 'play',
        title: 'No te lo quisieron',
        play: {
          hands: [
            [c(7, 'copa'), c(5, 'copa'), c(1, 'oro')],
            [c(3, 'espada'), c(11, 'oro'), c(6, 'basto')],
          ],
          mano: 0,
          rival: [ENVIDO, NO_QUIERO],
          cues: [
            { say: 'Tenés 32 de envido. Cantá envido.', expect: ENVIDO },
            {
              say: 'El rival lo subió: van dos envidos, 4 si se acepta. Subí: cantá real envido.',
              expect: REAL_ENVIDO,
            },
          ],
          goal: envidoScored,
          done: 'No te lo quisieron: cobrás 4, lo que valían los dos envidos antes de tu real envido.',
        },
      },
      {
        kind: 'say',
        title: 'Si no te lo quieren',
        text: 'Se cobra lo que valía todo antes del último canto. Si era el primero, 1.',
        visual: (
          <Chain
            lines={[
              ['Vos', 'Envido', 2],
              ['Rival', 'Envido', 4],
              ['Vos', 'Real envido', 7],
            ]}
            end="Rival: No quiero → cobrás 4"
          />
        ),
      },
      {
        kind: 'play',
        title: 'Te cantan envido con 29',
        play: {
          hands: [
            [c(6, 'copa'), c(3, 'copa'), c(12, 'oro')],
            [c(4, 'espada'), c(5, 'oro'), c(11, 'basto')],
          ],
          mano: 1,
          rival: [ENVIDO, NO_QUIERO],
          cues: [
            {
              say: 'El rival cantó envido y vos tenés 29. ¿Qué hacés?',
              expect: ENVIDO,
              free: {
                hint: 'Con 29 le ganás a la mayoría de las manos: querelo o subilo.',
                replies: [
                  { action: QUIERO, say: 'Lo quisiste y le ganaste: 2 para vos.' },
                  {
                    action: ENVIDO,
                    say: 'Lo subiste y no te lo quiso: cobrás 2, lo que valía el primer envido.',
                  },
                  {
                    action: REAL_ENVIDO,
                    say: 'Lo subiste con real envido y no te lo quiso: cobrás 2, lo que valía el envido.',
                  },
                  {
                    action: NO_QUIERO,
                    say: 'Con 29 le ganás a la mayoría de las manos: no lo largues. Probá otra.',
                    retry: true,
                  },
                ],
              },
            },
          ],
          goal: envidoScored,
          done: 'Con buenos puntos, querer o subir son las dos buenas opciones.',
        },
      },
      {
        kind: 'say',
        title: 'La falta envido',
        text: 'Vale lo que le falta al que va ganando para terminar la partida. No se suma a lo cantado antes: lo reemplaza.',
        rows: [
          ['A 15, van 12 a 8', 'Al que gana le faltan 3: la falta vale 3.'],
          ['A 15, van 5 a 2', 'Al que gana le faltan 10: la falta vale 10.'],
        ],
        more: [
          'Otras mesas',
          'Hay mesas que la cuentan distinto, sobre todo en partidas a 30. En esta app se juega así.',
        ],
      },
      {
        kind: 'choose',
        prompt: 'A 15, el rival va 10 y vos 6. ¿Cuánto vale una falta envido querida?',
        options: ['5', '9', '3'],
        answer: 0,
        explain: 'Al que va ganando, el rival, le faltan 5 para llegar a 15.',
        wrong: {
          '1': '9 es lo que te falta a vos. Cuenta lo que le falta al que va ganando. Probá otra vez.',
          '2': 'La falta no es un canto que suma 3: depende del marcador. Probá otra vez.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaron envido, envido y real envido, y te dicen No quiero. ¿Cuánto sumás?',
        options: ['4', '7', '1'],
        answer: 0,
        explain: 'Te llevás lo que valía antes del real envido: los dos envidos, 2 + 2 = 4.',
        wrong: {
          '1': '7 es si lo quieren. Si no, se cobra lo de antes del último canto. Probá otra vez.',
          '2': '1 es cuando no quieren el primer canto. Acá hubo tres. Probá otra vez.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaron envido y real envido, y lo quisieron. ¿Cuánto se lleva el que tiene más?',
        options: ['5', '3', '7'],
        answer: 0,
        explain: 'Se suma todo lo cantado: 2 + 3 = 5.',
        wrong: {
          '1': 'El real envido suma 3 a lo que ya había. Probá otra vez.',
          '2': '7 es con dos envidos y un real envido. Probá otra vez.',
        },
      },
    ],
  },
  {
    id: 'pardas-mas',
    title: 'Más casos de pardas',
    summary: 'Pardas después de la primera',
    stage: 4,
    guide: 'cartas',
    outro: 'Ya sabés resolver cualquier combinación de pardas.',
    steps: [
      {
        kind: 'say',
        title: 'Parda después',
        text: 'Si alguien ganó la primera y después hay parda, la mano es de quien ganó la primera.',
      },
      {
        kind: 'play',
        title: 'Empardá y ganá',
        play: {
          hands: [
            [c(1, 'espada'), c(3, 'copa'), c(4, 'oro')],
            [c(5, 'basto'), c(3, 'oro'), c(6, 'copa')],
          ],
          mano: 0,
          rival: [play(c(5, 'basto')), play(c(3, 'oro'))],
          cues: [
            { say: 'Sos mano. Tirá el ancho de espada.', expect: play(c(1, 'espada')) },
            {
              say: 'Ganaste la primera. Tirá el 3: si el rival emparda, la mano es tuya igual.',
              expect: play(c(3, 'copa')),
            },
          ],
          goal: roundOver,
          done: 'La segunda fue parda y la primera era tuya: ganaste la mano.',
        },
      },
      {
        kind: 'say',
        title: 'Primera y segunda pardas',
        text: 'Si las dos primeras son pardas, la tercera define. Y si las tres son pardas, gana el mano.',
      },
      {
        kind: 'choose',
        prompt: '¿Quién ganó esta mano?',
        visual: (
          <Tricks
            tricks={[
              [c(3, 'copa'), c(3, 'espada')],
              [c(2, 'oro'), c(2, 'basto')],
              [c(7, 'oro'), c(1, 'oro')],
            ]}
          />
        ),
        options: ['Vos', 'El rival', 'El mano'],
        answer: 0,
        explain:
          'Primera y segunda fueron pardas, así que definió la tercera: el 7 de oro le gana al 1 de oro.',
        wrong: {
          '1': 'Fijate la tercera: el 7 de oro está arriba de los anchos falsos. Probá otra vez.',
          '2': 'El mano gana solo si las tres son pardas. Probá otra vez.',
        },
      },
      {
        kind: 'choose',
        prompt: '¿Qué baza definió esa mano?',
        visual: (
          <Tricks
            tricks={[
              [c(3, 'copa'), c(3, 'espada')],
              [c(2, 'oro'), c(2, 'basto')],
              [c(7, 'oro'), c(1, 'oro')],
            ]}
          />
        ),
        options: ['La primera', 'La segunda', 'La tercera'],
        answer: 2,
        explain: 'Las dos primeras fueron pardas: definió la tercera.',
      },
      {
        kind: 'choose',
        prompt: 'Ganaste la primera y la segunda es parda. ¿Qué pasa?',
        options: ['La mano es tuya', 'Se juega la tercera', 'Gana el mano'],
        answer: 0,
        explain: 'El que ganó la primera se lleva la mano si después hay parda.',
      },
    ],
  },
  {
    id: 'mentir',
    title: 'Ganar con una mentira',
    summary: 'Cuándo conviene mentir',
    stage: 4,
    guide: 'cantos',
    helperAfter: true,
    outro: 'Ya practicaste lo básico. Probalo en una partida con ayudante.',
    steps: [
      {
        kind: 'say',
        title: 'Por qué funciona',
        text: 'Si el otro tampoco tiene buenas cartas, le conviene decir No quiero. Así te llevás la mano sin jugarla.',
      },
      {
        kind: 'say',
        title: 'Es arriesgado',
        text: 'Si te lo quieren, tenés que jugar la mano con esas cartas, y si perdés el otro se lleva 2 en vez de 1. Si mentís siempre, te van a querer todo.',
      },
      {
        kind: 'say',
        title: 'También en el envido',
        text: 'Podés apostar con pocos puntos: si sentís que el otro tiene poco, cantá envido para rascar 1 punto si no te lo quiere. Lo que no vale es mentir el número: si ganás el envido, los puntos que decís tienen que estar en tus cartas.',
      },
      {
        kind: 'say',
        title: 'Cuándo conviene',
        text: 'No hay una regla fija, pero estas pistas ayudan:',
        rows: [
          [
            'Ganaste la primera',
            'El otro tiene que ganar las dos que quedan: le cuesta más querer.',
          ],
          ['El otro tiró cartas bajas', 'Si tiró un 4 o un 5, capaz que no tiene nada.'],
          ['Vas ganando por varios', 'Si te sale mal, perder 2 puntos duele menos.'],
        ],
      },
      {
        kind: 'choose',
        prompt: 'Cantaste envido con 5 y te dijeron No quiero. ¿Cuánto sumás?',
        options: ['1', '2', 'Nada'],
        answer: 0,
        explain:
          'Un envido no querido vale 1, tengas lo que tengas. Y nadie se entera de tus puntos.',
        wrong: {
          '1': 'Los 2 son si te lo quieren y ganás. Probá otra vez.',
          '2': 'No te lo quisieron: algo sumás, aunque tengas 5. Probá otra vez.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Quisieron tu envido con 5 y el rival dijo 30. ¿Podés decir 31?',
        options: [
          'No: tenés que decir lo que tenés',
          'Sí, total no ve tus cartas',
          'Solo si sos mano',
        ],
        answer: 0,
        explain:
          'Apostar con pocos puntos vale; declarar puntos que no tenés, no. Los puntos que ganan tienen que estar en tus cartas.',
      },
    ],
  },
  {
    id: 'flor',
    title: 'Si en tu mesa juegan con flor',
    summary: 'Opcional: tres del mismo palo',
    stage: 4,
    optional: true,
    outro: 'Ya sabés cómo se juega la flor en esta app.',
    steps: [
      {
        kind: 'say',
        title: 'Tres del mismo palo',
        text: 'Algunas mesas juegan con flor. Si tus tres cartas son del mismo palo, tenés flor.',
        visual: <Cards cards={[c(7, 'copa'), c(5, 'copa'), c(1, 'copa')]} />,
      },
      {
        kind: 'say',
        title: 'Se canta sola',
        text: 'La flor suma 3 puntos y en esa mano no hay envido.',
      },
      {
        kind: 'say',
        title: 'Si los dos tienen flor',
        text: 'En esta app gana la flor más alta y suma 6. Es una versión simple: en muchas mesas además se canta contraflor o uno se puede achicar.',
      },
    ],
  },
]

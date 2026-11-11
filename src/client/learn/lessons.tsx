import type { Card } from '../../engine/cards.ts'
import { CardView } from '../Card.tsx'
import { Fosforos } from '../Fosforos.tsx'
import type { Action, GameEvent } from '../../engine/game.ts'
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

export const LESSONS: Lesson[] = [
  {
    id: 'objetivo',
    title: 'De qué se trata',
    summary: 'Cómo se gana una partida',
    hook: 'Una partida de truco dura 5 minutos y se juega con lo que tengas: un mazo, un teléfono, un asado de fondo. En 2 minutos vas a entender cómo funciona.',
    outro: 'Ya sabés cómo funciona una partida. Ahora: las cartas.',
    steps: [
      {
        kind: 'say',
        title: 'Gana el primero que llega a 15',
        text: 'Se juega de a dos o en equipos. La partida es a 15 puntos, o a 30 si quieren jugar más largo.',
        visual: <Fosforos points={15} target={15} big />,
        next: 'Mirá esto',
      },
      {
        kind: 'say',
        title: 'Se juega por manos',
        text: 'En cada mano se reparten tres cartas a cada uno. Los puntos salen de tres lugares:',
        rows: [
          ['Ganar la mano', '1 punto'],
          ['El truco', '2, 3 o 4 puntos'],
          ['El envido', '2 puntos o más'],
        ],
        next: 'Ahora probalo',
      },
      {
        kind: 'play',
        title: 'Probá tirar una carta',
        play: {
          hands: [
            [c(3, 'copa'), c(5, 'oro'), c(11, 'basto')],
            [c(12, 'oro'), c(6, 'espada'), c(4, 'copa')],
          ],
          mano: 0,
          rival: [play(c(12, 'oro')), play(c(4, 'copa'))],
          cues: [
            {
              say: 'Empezás vos. Gana la carta más fuerte, y el 3 es de las mejores: tiralo.',
              expect: play(c(3, 'copa')),
            },
            {
              say: 'Ganaste la primera de tres. Tirá cualquiera: si ganás otra, la mano es tuya.',
              expect: play(c(5, 'oro')),
              or: [play(c(11, 'basto'))],
            },
          ],
          goal: roundOver,
          done: 'Acabás de ganar tu primera mano. Eso es 1 punto.',
        },
      },
      {
        kind: 'say',
        title: 'Los puntos se anotan con fósforos',
        text: 'Cuatro fósforos forman un cuadrado y el quinto lo cruza. Cada cuadrado son 5 puntos.',
        visual: <Fosforos points={5} target={15} big />,
      },
      {
        kind: 'choose',
        prompt: 'Si nadie canta nada, ¿cuánto vale ganar una mano?',
        options: ['1 punto', '2 puntos', 'Nada'],
        answer: 0,
        explain: 'Ganar la mano da 1 punto. El truco y el envido son apuestas para sumar más.',
      },
    ],
  },
  {
    id: 'cartas',
    title: 'Cuál le gana a cuál',
    summary: 'La escala de las cartas',
    hook: 'En el truco no gana la carta más alta: gana la que está más arriba en una escala que tiene su propia lógica. Acá vas a ver cuáles son las que mandan.',
    outro: 'Ya sabés qué carta le gana a cuál. Ahora: a jugar.',
    steps: [
      {
        kind: 'say',
        title: 'Cuarenta cartas, cuatro palos',
        text: 'Se juega con la baraja española: espada, basto, oro y copa, del 1 al 12 sin 8 ni 9. La escala no hace falta memorizarla: se aprende jugando, y siempre la podés consultar en la Guía rápida.',
        visual: <Cards cards={[c(1, 'espada'), c(1, 'basto'), c(1, 'oro'), c(1, 'copa')]} />,
        next: 'Dale, mostrame',
      },
      {
        kind: 'say',
        title: 'Las cuatro más fuertes',
        text: 'No importa el número sino el orden del truco. Arriba de todo están estas cuatro, de mayor a menor.',
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
        praise: 'Ya ubicás las cuatro de arriba.',
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
        praise: 'La escala ya te va entrando.',
      },
      {
        kind: 'say',
        title: 'Siempre la tenés a mano',
        text: '¿Ves? No era tanta. Las cuatro de arriba, los 3, los 2, los anchos falsos y las negras. Lo demás se aprende en la mesa. Y si te trabás, la Guía rápida está siempre en el botón ?.',
      },
    ],
  },
  {
    id: 'ronda',
    title: 'Jugá una mano entera',
    summary: 'Las tres bazas y quién empieza',
    hook: 'Ya sabés qué carta le gana a cuál. Ahora vas a jugar manos de verdad: tirar, ganar bazas y sumar puntos.',
    outro: 'Ya podés jugar una mano entera. Ahora viene lo que hace al truco interesante.',
    steps: [
      {
        kind: 'say',
        title: 'Tres bazas',
        text: 'Cada uno tira una carta y la más fuerte se lleva la baza. En la mesa se les dice primera, segunda y tercera.',
        visual: <Cards cards={[c(3, 'copa'), c(12, 'copa')]} labels={['Vos', 'El rival']} />,
      },
      {
        kind: 'say',
        title: 'Dos bazas ganan la mano',
        text: 'Si ganás la primera y la segunda, la mano es tuya y no hace falta jugar la tercera.',
      },
      {
        kind: 'say',
        title: 'Quién empieza',
        text: 'El que es mano tira primero. Después de cada baza empieza el que la ganó. En la mano siguiente, el mano es el otro.',
        next: 'Ahora jugala',
      },
      {
        kind: 'play',
        title: 'Jugá una mano',
        hint: 'Si no te acordás cuál gana, abrí la Guía rápida con el ?.',
        play: {
          hands: [
            [c(1, 'espada'), c(3, 'copa'), c(5, 'oro')],
            [c(2, 'basto'), c(12, 'copa'), c(4, 'espada')],
          ],
          mano: 0,
          rival: [play(c(12, 'copa')), play(c(4, 'espada'))],
          cues: [
            { say: 'Sos mano: empezás vos. Tirá el 3 de copa.', expect: play(c(3, 'copa')) },
            {
              say: 'Ganaste la primera, así que empezás de nuevo. Tirá el ancho de espada.',
              expect: play(c(1, 'espada')),
            },
          ],
          goal: roundOver,
          done: 'Ganaste la primera y la segunda: la mano es tuya y sumás 1 punto. Eso es jugar al truco.',
        },
      },
      {
        kind: 'say',
        title: 'Guardá las buenas',
        text: 'Si en la primera no podés ganarle, tirá tu carta más baja y guardá las fuertes para la segunda y la tercera.',
      },
      {
        kind: 'play',
        title: 'Ahora empieza el rival',
        play: {
          hands: [
            [c(7, 'oro'), c(4, 'basto'), c(2, 'copa')],
            [c(3, 'espada'), c(6, 'oro'), c(5, 'copa')],
          ],
          mano: 1,
          rival: [play(c(3, 'espada')), play(c(5, 'copa')), play(c(6, 'oro'))],
          cues: [
            {
              say: 'El rival tiró un 3 y no tenés cómo ganarle. Tirá tu carta más baja: el 4 de basto.',
              expect: play(c(4, 'basto')),
            },
            { say: 'Ahora ganale con el 2 de copa.', expect: play(c(2, 'copa')) },
            {
              say: 'Una baza cada uno: la tercera define. Tirá el 7 de oro.',
              expect: play(c(7, 'oro')),
            },
          ],
          goal: roundOver,
          done: 'Perdiste la primera pero ganaste las otras dos. Guardar la buena y tirar la mala: eso es pensar.',
        },
      },
    ],
  },
  {
    id: 'pardas',
    title: 'Qué pasa si empatan',
    summary: 'Las pardas',
    hook: '¿Qué pasa cuando los dos tiran una carta igual de fuerte? No es tan raro, y cambia quién gana la mano.',
    outro:
      'Ya sabés jugar manos, con pardas y todo. Ahora viene lo que hace al truco distinto: apostar, mentir y hacer que el otro se achique. Lo mejor del juego.',
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
              say: 'Parda la primera: la segunda define la mano. Empezás vos por ser mano. Tirá el 7 de espada.',
              expect: play(c(7, 'espada')),
            },
          ],
          goal: roundOver,
          done: 'Con la primera parda, ganar la segunda te dio la mano.',
        },
      },
      {
        kind: 'say',
        title: 'Parda después',
        text: 'Si alguien ya ganó la primera y después hay parda, la mano es de quien ganó la primera. Si las tres son pardas, gana el mano.',
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
    id: 'truco',
    title: 'Apostar por la mano',
    summary: 'El truco, el retruco y el vale cuatro',
    hook: 'Hasta ahora, ganar una mano daba 1 punto. Poco. El truco es la forma de apostar más por una mano, y también de asustar al otro para que se rinda.',
    outro: 'Ya sabés cantar truco, subir y saber cuándo no querer. Falta el envido.',
    steps: [
      {
        kind: 'say',
        title: 'Cantar truco',
        text: 'En tu turno, antes de tirar, podés cantar truco. Si te lo quieren, la mano pasa a valer 2 puntos.',
        next: 'Mirá esto',
      },
      {
        kind: 'say',
        title: 'Las respuestas',
        text: 'Cuando te cantan truco, tenés tres respuestas:',
        rows: [
          ['Quiero', 'Se juega la mano por 2 puntos.'],
          ['No quiero', 'El que cantó se lleva 1 punto y la mano termina.'],
          ['Quiero retruco', 'Aceptás y subís la apuesta a 3.'],
        ],
        next: 'Ahora probalo',
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
        kind: 'say',
        title: 'Saber no querer',
        text: 'Si te cantan truco y tus cartas son flojas, conviene decir No quiero: perdés 1 punto en vez de 2.',
        next: '¿Y si te cantan a vos?',
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
              say: 'Te cantaron truco y tus cartas son flojas. Decí No quiero.',
              expect: NO_QUIERO,
            },
          ],
          goal: roundOver,
          done: 'El rival sumó 1 punto en vez de 2. Saber no querer es tan importante como saber cantar.',
        },
      },
      {
        kind: 'say',
        title: 'Retruco, vale cuatro y el mazo',
        text: 'La apuesta puede subir dos veces más. Solo sube el que dijo quiero.',
        rows: [
          ['Truco', 'La mano vale 2.'],
          ['Retruco', 'La mano vale 3.'],
          ['Vale cuatro', 'La mano vale 4.'],
          ['Me voy al mazo', 'En tu turno podés dejar la mano. El otro se lleva lo que valía.'],
        ],
      },
      {
        kind: 'say',
        title: 'Al 4 no se le canta truco',
        text: 'Si el rival tiró un 4, no le podés cantar truco hasta que tires tu carta. Es una regla de la mesa, y en el juego el botón no aparece.',
        visual: <Cards cards={[c(4, 'basto')]} labels={['Lo que tiró el rival']} />,
      },
      {
        kind: 'choose',
        prompt: 'Cantaste truco y te dijeron No quiero. ¿Cuántos puntos sumás?',
        options: ['1', '2', '3'],
        answer: 0,
        explain: 'Si no te quieren el truco, sumás lo que valía la mano antes: 1 punto.',
      },
    ],
  },
  {
    id: 'contar-envido',
    title: 'Contá tus puntos',
    summary: 'Cuánto tenés de envido',
    hook: 'Tus cartas tienen un valor escondido que depende de los palos. Saber contarlo te da puntos extra en cada mano, sin jugarla mejor.',
    outro: 'Ya contás el envido sin pensar. Ahora: cómo apostarlo.',
    steps: [
      {
        kind: 'say',
        title: 'Una apuesta aparte',
        text: 'El envido se juega al principio de la mano y gana el que tiene más puntos de envido en sus cartas.',
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
        next: 'A ver si lo contás',
      },
      {
        kind: 'count',
        hand: [c(6, 'copa'), c(3, 'copa'), c(1, 'espada')],
        options: [9, 29, 23],
        explain: 'El 6 y el 3 son de copa: 20 + 6 + 3 = 29.',
        praise: 'Si podés contar este, podés contar cualquiera.',
        hint: 'Podés consultar la regla del envido en la Guía rápida.',
      },
      {
        kind: 'count',
        hand: [c(10, 'oro'), c(4, 'oro'), c(7, 'basto')],
        options: [24, 7, 14],
        explain: 'El 10 y el 4 son de oro, y el 10 es negra: vale 0. 20 + 0 + 4 = 24.',
      },
      {
        kind: 'count',
        hand: [c(2, 'espada'), c(5, 'basto'), c(12, 'copa')],
        options: [25, 12, 5],
        explain:
          'No hay dos del mismo palo: vale la más alta para el envido, el 5. Acordate que el 12 es negra y vale 0.',
      },
      {
        kind: 'count',
        hand: [c(7, 'espada'), c(6, 'espada'), c(1, 'basto')],
        options: [34, 33, 13],
        explain: '20 + 7 + 6 = 33. Es lo máximo que se puede tener.',
        praise: 'Cuando te toque un 33 en una partida, lo vas a sentir.',
      },
    ],
  },
  {
    id: 'cantar-envido',
    title: 'Apostar con el envido',
    summary: 'Envido, real envido y falta envido',
    hook: 'Ya sabés cuántos puntos de envido tenés. Ahora viene la apuesta: cantarlo en la mesa, subirlo y decidir cuándo conviene y cuándo no.',
    outro: 'Truco y envido: ya tenés las dos apuestas. Quedan la flor y la parte más divertida.',
    steps: [
      {
        kind: 'say',
        title: 'Cuándo se canta',
        text: 'En la primera baza, antes de tirar tu carta. Si te lo quieren, se juega por 2 puntos.',
      },
      {
        kind: 'say',
        title: 'Cómo se compara',
        text: 'Si te lo quieren, el mano dice sus puntos primero. Si el otro no tiene más, dice Son buenas. Si empatan, gana el mano.',
        next: 'Ahora cantalo',
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
        kind: 'say',
        title: 'Subir el envido',
        text: 'Si te cantan envido, en vez de contestar quiero o no quiero podés subirlo. Cada canto se suma a lo que ya había.',
        rows: [
          ['Envido', 'Suma 2. Se puede cantar hasta dos veces seguidas.'],
          ['Real envido', 'Suma 3.'],
          ['Falta envido', 'Vale lo que le falta al que va ganando para terminar la partida.'],
        ],
      },
      {
        kind: 'play',
        title: 'Envido, envido, real envido',
        play: {
          hands: [
            [c(7, 'espada'), c(5, 'espada'), c(10, 'copa')],
            [c(6, 'oro'), c(3, 'oro'), c(12, 'basto')],
          ],
          mano: 0,
          rival: [ENVIDO, QUIERO],
          cues: [
            { say: 'Tenés 32 de envido. Cantá envido.', expect: ENVIDO },
            {
              say: 'El rival lo subió con otro envido. Tenés 32, subí más: cantá real envido.',
              expect: REAL_ENVIDO,
            },
          ],
          goal: envidoScored,
          done: 'Envido, envido y real envido: si te lo quieren son 7 puntos. El rival dijo Son buenas: 7 para vos.',
        },
      },
      {
        kind: 'say',
        title: 'Se va sumando',
        text: 'Si al final te lo quieren, el que tiene más puntos de envido se lleva todo lo cantado.',
        rows: [
          ['Envido', '2 puntos'],
          ['Envido + envido', '2 + 2 = 4 puntos'],
          ['Envido + real envido', '2 + 3 = 5 puntos'],
          ['Envido + envido + real envido', '2 + 2 + 3 = 7 puntos'],
        ],
      },
      {
        kind: 'play',
        title: 'No te lo quisieron',
        play: {
          hands: [
            [c(1, 'copa'), c(4, 'copa'), c(7, 'basto')],
            [c(3, 'espada'), c(11, 'oro'), c(6, 'basto')],
          ],
          mano: 0,
          rival: [ENVIDO, NO_QUIERO],
          cues: [
            { say: 'Tenés 25 de envido. Cantá envido.', expect: ENVIDO },
            {
              say: 'El rival lo subió: van dos envidos, 4 puntos. Subí más: cantá real envido.',
              expect: REAL_ENVIDO,
            },
          ],
          goal: envidoScored,
          done: 'No te lo quisieron: te llevás lo que valía antes del real envido, 4 puntos. Cuando no te quieren, te llevás lo acumulado antes de tu último canto.',
        },
      },
      {
        kind: 'say',
        title: 'Si no te lo quieren',
        text: 'El que cantó último se lleva lo que valía todo lo anterior a su canto. Si era el primer canto, se lleva 1.',
        rows: [
          ['Envido y no quiero', '1 punto'],
          ['Envido + envido y no quiero', '2 puntos, lo que valía el primer envido'],
          ['Envido + envido + real envido y no quiero', '4 puntos, lo que valían los dos envidos'],
        ],
      },
      {
        kind: 'play',
        title: 'Subile el envido',
        play: {
          hands: [
            [c(6, 'copa'), c(3, 'copa'), c(12, 'oro')],
            [c(4, 'espada'), c(5, 'oro'), c(11, 'basto')],
          ],
          mano: 1,
          rival: [ENVIDO, NO_QUIERO],
          cues: [
            {
              say: 'El rival cantó envido y vos tenés 29. En vez de querer, subilo: cantá envido.',
              expect: ENVIDO,
            },
          ],
          goal: envidoScored,
          done: 'No te quisieron el segundo envido: te llevás 2, lo que valía el primero.',
        },
      },
      {
        kind: 'choose',
        prompt: 'Cantaron envido, envido y real envido, y te dicen No quiero. ¿Cuánto sumás?',
        options: ['4', '7', '1'],
        answer: 0,
        explain: 'Te llevás lo que valía antes del real envido: los dos envidos, 2 + 2 = 4.',
      },
      {
        kind: 'choose',
        prompt: 'Cantaron envido y real envido, y lo quisieron. ¿Cuánto se lleva el que tiene más?',
        options: ['5', '3', '7'],
        answer: 0,
        explain: 'Se suma todo lo cantado: 2 + 3 = 5.',
      },
      {
        kind: 'say',
        title: 'El envido va primero',
        text: 'Si te cantan truco y todavía no tiraste, podés contestar con envido. Se juega el envido y después respondés el truco.',
        next: 'Esto pasa seguido',
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
      },
    ],
  },
  {
    id: 'flor',
    title: 'La flor',
    summary: 'Solo si juegan con flor',
    hook: 'Si tus tres cartas son del mismo palo, tenés flor. Es raro, pero cuando pasa vale mucho. Esta es la lección más corta.',
    outro:
      'Si alguna vez te tocan tres del mismo palo, vas a saber qué hacer. Última lección: mentir.',
    steps: [
      {
        kind: 'say',
        title: 'Tres del mismo palo',
        text: 'Algunos juegan con flor. Si tus tres cartas son del mismo palo, tenés flor.',
        visual: <Cards cards={[c(7, 'copa'), c(5, 'copa'), c(1, 'copa')]} />,
      },
      {
        kind: 'say',
        title: 'Se canta sola',
        text: 'La flor suma 3 puntos y en esa mano no hay envido. Si los dos tienen flor, gana la más alta y suma 6.',
      },
    ],
  },
  {
    id: 'mentir',
    title: 'Ganar sin cartas',
    summary: 'Mentir en el truco y en el envido',
    hook: 'A veces tus cartas son horribles y la mano parece perdida. Pero el rival no las ve. Esto es lo que hace al truco distinto de cualquier otro juego de cartas.',
    outro: 'Ya sabés todo lo que necesitás. Jugá una partida con ayudante y llevalo a la mesa.',
    steps: [
      {
        kind: 'say',
        title: 'En el truco se miente',
        text: 'Nadie ve tus cartas. Podés cantar truco aunque tengas cartas malas, para que el otro crea que tenés buenas y no te lo quiera.',
      },
      {
        kind: 'say',
        title: 'Por qué funciona',
        text: 'Si el otro tampoco tiene buenas cartas, le conviene decir No quiero. Así te llevás la mano sin jugarla.',
        next: 'Probá mentir',
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
          done: 'El rival no te lo quiso: te llevaste 1 punto con cartas malas. Así se juega el truco de verdad.',
        },
      },
      {
        kind: 'say',
        title: 'Es arriesgado',
        text: 'Si te lo quieren, tenés que jugar la mano con esas cartas, y si perdés el otro se lleva 2 en vez de 1. Mentí de vez en cuando: si mentís siempre, te van a querer todo.',
      },
      {
        kind: 'say',
        title: 'También en el envido',
        text: 'Si sentís que el otro tiene pocos puntos, podés cantar envido aunque vos tampoco tengas, para rascar 1 punto si no te lo quiere. Si te lo quiere y tiene más, se lleva 2.',
        next: 'Mirá esto',
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
        prompt: 'Cantaste truco mintiendo y te dijeron Quiero. ¿Qué pasa?',
        options: ['Se juega la mano por 2', 'Te llevás 1 punto igual', 'Se reparte de nuevo'],
        answer: 0,
        explain:
          'Si te quieren la mentira, se juega por 2 y tenés que ganarla con tus cartas. Por eso es arriesgado.',
        praise: 'Mentí con cuidado.',
      },
      {
        kind: 'choose',
        prompt: 'Cantaste envido con 5 y te dijeron No quiero. ¿Cuánto sumás?',
        options: ['1', '2', 'Nada'],
        answer: 0,
        explain:
          'Un envido no querido vale 1, tengas lo que tengas. Y nadie se entera de tus puntos.',
      },
    ],
  },
]

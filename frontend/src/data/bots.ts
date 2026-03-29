import type { Bot, BotLevel } from '@/types/game.types'

export const BOTS: Bot[] = [
  { id: 'filhote',       name: 'Aprendiz',  level: 'filhote',       skillLevel: 0,  rating: 600,  description: 'Ainda está aprendendo'       },
  { id: 'iniciante',     name: 'Recruta',   level: 'iniciante',     skillLevel: 3,  rating: 900,  description: 'Perfeito para começar'        },
  { id: 'amador',        name: 'Caçador',   level: 'amador',        skillLevel: 6,  rating: 1200, description: 'Começa a entender o jogo'     },
  { id: 'intermediario', name: 'Cavaleiro', level: 'intermediario', skillLevel: 10, rating: 1500, description: 'Um desafio de verdade'        },
  { id: 'avancado',      name: 'Paladino',  level: 'avancado',      skillLevel: 14, rating: 1800, description: 'Joga com consistência'        },
  { id: 'guerreiro',     name: 'Veterano',  level: 'guerreiro',     skillLevel: 17, rating: 2000, description: 'Poucos erros, muita pressão' },
  { id: 'mestre',        name: 'Lendário',  level: 'mestre',        skillLevel: 20, rating: 2400, description: 'Sem piedade'                 },
]

export const BOT_STARS: Record<BotLevel, number> = {
  filhote:       1,
  iniciante:     2,
  amador:        3,
  intermediario: 4,
  avancado:      5,
  guerreiro:     6,
  mestre:        7,
}

export const BOT_ACCENT: Record<BotLevel, string> = {
  filhote:       '#6B8F71',
  iniciante:     '#4A9E7A',
  amador:        '#C8A84B',
  intermediario: '#EE964B',
  avancado:      '#E06B2B',
  guerreiro:     '#C0392B',
  mestre:        '#813405',
}

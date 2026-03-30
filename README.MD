# ♟️ Chess Guild

**Desafie bots lendários, analise suas jogadas e domine o tabuleiro.**

O **Chess Guild** é uma plataforma de xadrez imersiva, inspirada em elementos de RPG, desenvolvida inteiramente no client-side. O projeto foi concebido para oferecer não apenas o jogo, mas uma ferramenta completa de estudo e evolução para enxadristas.


Tudo acontece no navegador: desde a engine de IA (**Stockfish 18 via WebAssembly**) até a geração de relatórios detalhados em PDF. Sem back-end, sem latência, apenas performance.

Link: https://chessguild.vercel.app/

---

## 🚀 Diferenciais do Projeto

* **Bots com Personalidade:** 7 níveis de dificuldade, do Aprendiz ao Mago Ancião (ELO 600 → 2400+).
* **Análise de Precisão:** Sistema de classificação de jogadas (Brilhante, Excelente, Erro, etc.) baseado em perda de centipawns.
* **UI/UX Imersiva:** Interface moderna com efeitos de inclinação 3D (Tilt), partículas dinâmicas e temas customizáveis.
* **Relatórios PDF:** Exporte o histórico da sua partida, gráfico de vantagem e precisão em um documento profissional.
* **Privacidade Total:** 100% local. Nenhum dado sai do seu computador.

---

## 🛠️ Tech Stack

O projeto utiliza o que há de mais moderno no ecossistema Web para garantir performance e manutenibilidade.

| Camada | Tecnologia |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Linguagem** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4 |
| **Componentes** | React 19, shadcn/ui, Radix UI |
| **Chess Engine** | Stockfish 18 (WASM) |
| **Lógica de Jogo** | Chess.js + React-Chessboard v5 |
| **Exportação** | jsPDF |

---

## 🧙‍♂️ Progressão de Bots (The Ladder)

Os bots foram calibrados para simular o comportamento humano em diferentes faixas de rating.

| Bot | Rank | ELO Estimado | Estilo de Jogo |
|---|---|---|---|
| **Aprendiz** | I | 600 | Iniciante, foco em aprender movimentos básicos. |
| **Escudeiro** | II | 900 | Começa a entender táticas de abertura. |
| **Caçador** | III | 1200 | Jogo posicional básico e táticas de garfo. |
| **Cavaleiro** | IV | 1500 | Sólido, pune erros táticos graves. |
| **Veterano** | V | 1800 | Estrategista, domina finais de partida. |
| **Mestre de Guerra** | VI | 2000 | Brutal, exige precisão absoluta do jogador. |
| **Mago Ancião** | VII | 2400+ | Quase imbatível, nível de Mestre Internacional. |

---

## 📈 Sistema de Análise

Após cada partida, a engine processa todos os lances em profundidade para gerar um score de precisão.

* ✨ **Brilhante:** O único lance vencedor em uma posição crítica.
* ✅ **Excelente:** A melhor escolha da engine.
* ⚠️ **Imprecisão:** Um lance que cede vantagem sutil.
* ❌ **Capivarada (Blunder):** Um erro grave que altera drasticamente o resultado.

---

## 🗺️ Roadmap (Implementações Futuras)

O Chess Guild está em constante evolução. Estas são as próximas funcionalidades planejadas:

- [ ] **AI Mentor:** Integrar uma IA (LLM) que atue como um professor, explicando em linguagem natural *por que* um lance foi considerado um erro.
- [ ] **Sistema de Login & Cloud Sync:** Implementação de autenticação para armazenar o histórico global de partidas e evolução de ELO do usuário.
- [ ] **Guild Expansion:** Adição de novos bots com estilos de jogo específicos (agressivos, defensivos, gambiteiros).
- [ ] **Multiplayer Local:** Modo de dois jogadores no mesmo dispositivo com relógio de xadrez integrado.

---

## 🔧 Instalação e Uso Local

```bash
# Clone o repositório
git clone [https://github.com/EduardoFedeli/Chess-Guild.git](https://github.com/EduardoFedeli/Chess-Guild.git)

# Entre na pasta e instale as dependências
cd Chess-Guild
npm install

# Inicie o servidor de desenvolvimento
npm run dev

Abra http://localhost:3000 no seu navegador.



import "./style.css";
import { applyMove, createGame, readOpponentMoves, type GameState } from "./game";

const app = document.querySelector<HTMLDivElement>("#app")!;
let ysdk: YaGamesSDK | null = null;
let playerName = "Игрок";
let state: GameState = createGame();
let opponentMoves: number[] = [];
let opponentIndex = 0;
let opponentName = "Соперник";
let onlineSession = false;
let busy = false;
let mode: "menu" | "game" = "menu";
let statusMessage = "Подключаем игровые сервисы…";

const escapeHtml = (value: string) => {
  const replacements: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (char) => replacements[char]);
};

async function initYandex(): Promise<void> {
  try {
    if (typeof YaGames === "undefined") {
      statusMessage = "Локальный режим. SDK Яндекс Игр доступен после загрузки игры на платформу.";
      render();
      return;
    }
    ysdk = await YaGames.init();
    const player = await ysdk.getPlayer();
    playerName = player.getName() || "Игрок";
    statusMessage = "Игровые сервисы подключены";
  } catch {
    statusMessage = "Не удалось подключить SDK. Доступна тренировка.";
  }
  render();
}

function renderMenu(): void {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar"><div class="brand-mark">15</div><span>PICK / 15</span><span class="top-status">${escapeHtml(statusMessage)}</span></header>
      <section class="hero">
        <div class="eyebrow">ЧИСЛОВАЯ ДУЭЛЬ</div>
        <h1>Игра в <span>15</span></h1>
        <p class="lead">Выбирай числа от 1 до 9. Собери три числа с суммой 15 раньше соперника.</p>
        <div class="rules-card">
          <div class="rule"><b>01</b><span>Ходите по очереди</span></div>
          <div class="rule"><b>02</b><span>Каждое число можно выбрать только один раз</span></div>
          <div class="rule"><b>03</b><span>Три числа в сумме дают 15 — победа</span></div>
        </div>
        <div class="menu-actions">
          <button class="primary-button" id="online">Играть с соперником <span>→</span></button>
          <button class="secondary-button" id="practice">Тренировка против компьютера</button>
        </div>
        <div class="mode-note">Онлайн-матчи используют асинхронные партии игроков Яндекс Игр.</div>
      </section>
      <footer>Короткая игра. Один победитель.</footer>
    </main>`;
  document.querySelector("#online")?.addEventListener("click", () => startGame(true));
  document.querySelector("#practice")?.addEventListener("click", () => startGame(false));
}

function renderGame(): void {
  const you = state.moves.filter((move) => move.player === "you").map((move) => move.number);
  const opponent = state.moves.filter((move) => move.player === "opponent").map((move) => move.number);
  const turnText = state.status !== "playing"
    ? state.status === "you-won" ? "Победа" : state.status === "opponent-won" ? "Поражение" : "Ничья"
    : busy ? "Ход соперника…" : state.turn === "you" ? "Ваш ход" : "Ход соперника";
  const numberButtons = Array.from({ length: 9 }, (_, index) => index + 1).map((number) => {
    const used = !state.available.includes(number);
    const owner = state.moves.find((move) => move.number === number)?.player;
    const isWinning = state.winningLine?.includes(number);
    return `<button class="number-tile ${used ? "used" : ""} ${owner === "you" ? "mine" : ""} ${owner === "opponent" ? "theirs" : ""} ${isWinning ? "winning" : ""}" data-number="${number}" ${used || busy || state.status !== "playing" || state.turn !== "you" ? "disabled" : ""}>${number}<i>${owner === "you" ? "ВЫ" : owner === "opponent" ? "ИИ" : ""}</i></button>`;
  }).join("");

  app.innerHTML = `
    <main class="shell game-shell">
      <header class="topbar"><button class="back-button" id="back">←</button><span class="brand-mark small">15</span><span>PICK / 15</span><span class="top-status">${onlineSession ? "ОНЛАЙН-ПАРТИЯ" : "ТРЕНИРОВКА"}</span></header>
      <section class="game-layout">
        <div class="game-heading"><div class="eyebrow">ЧИСЛОВАЯ ДУЭЛЬ</div><h1>Собери <span>15</span></h1><p>Выбери три числа, сумма которых равна 15.</p></div>
        <div class="players">
          <div class="player-card active"><div class="player-avatar">Я</div><div><small>ИГРОК 1</small><strong>${escapeHtml(playerName)}</strong></div><div class="player-numbers">${you.length}/3</div></div>
          <div class="versus">VS</div>
          <div class="player-card"><div class="player-avatar opponent-avatar">2</div><div><small>ИГРОК 2</small><strong>${escapeHtml(opponentName)}</strong></div><div class="player-numbers">${opponent.length}/3</div></div>
        </div>
        <div class="turn-label">${turnText}</div>
        <div class="board">${numberButtons}</div>
        <div class="picked-row">
          <div><small>ВАШИ ЧИСЛА</small><strong>${you.length ? you.join("  +  ") : "—"}</strong></div>
          <div class="sum-value">${you.reduce((sum, n) => sum + n, 0)} <small>/ 15</small></div>
        </div>
        ${state.status !== "playing" ? `<div class="result-panel"><strong>${turnText}</strong><span>${state.status === "you-won" ? "Вы собрали комбинацию 15." : state.status === "opponent-won" ? "Соперник собрал комбинацию 15." : "Все числа закончились."}</span><button class="primary-button" id="again">В меню</button></div>` : ""}
        <div class="game-footnote">${busy ? "Ожидаем ход соперника" : state.status === "playing" ? "Числа нельзя выбирать повторно" : "Партия завершена"}</div>
      </section>
    </main>`;
  document.querySelector("#back")?.addEventListener("click", goMenu);
  document.querySelector("#again")?.addEventListener("click", goMenu);
  document.querySelectorAll<HTMLButtonElement>("[data-number]").forEach((button) => {
    button.addEventListener("click", () => {
      const number = Number(button.dataset.number);
      void makeMove(number);
    });
  });
}

function render(): void {
  if (mode === "menu") renderMenu();
  else renderGame();
}

function startGame(online: boolean): void {
  state = createGame();
  opponentIndex = 0;
  opponentMoves = [];
  onlineSession = online;
  busy = false;
  opponentName = online ? "Игрок Яндекс Игр" : "Компьютер";
  mode = "game";
  ysdk?.features?.GameplayAPI?.start();
  render();
  if (online) void findOpponent();
  else statusMessage = "Тренировка";
}

async function findOpponent(): Promise<void> {
  if (!ysdk) {
    opponentName = "Компьютер (демо)";
    statusMessage = "SDK недоступен — запущена тренировка";
    render();
    return;
  }
  try {
    const opponents = await ysdk.multiplayer.sessions.init({
      count: 1,
      isEventBased: false,
      meta: { meta1: { min: 0, max: 1 } },
    });
    const opponent = opponents[0];
    if (opponent) {
      opponentMoves = readOpponentMoves(opponent);
      opponentName = opponent.player?.name || "Игрок Яндекс Игр";
    } else {
      opponentName = "Компьютер";
      statusMessage = "Пока нет готовых партий. Вы сыграете тренировочную партию.";
    }
  } catch {
    opponentName = "Компьютер";
    statusMessage = "Не удалось найти соперника. Запущена тренировка.";
  }
  render();
}

async function makeMove(number: number): Promise<void> {
  if (busy || state.turn !== "you" || state.status !== "playing") return;
  state = applyMove(state, "you", number);
  if (onlineSession) {
    try {
      ysdk?.multiplayer.sessions.commit({ type: "pick", number });
    } catch { /* SDK may be unavailable in local preview. */ }
  }
  render();
  if (state.status !== "playing") {
    await finishGame();
    return;
  }
  busy = true;
  render();
  window.setTimeout(() => {
    if (state.status !== "playing") return;
    const next = opponentMoves[opponentIndex++];
    const opponentNumber = next && state.available.includes(next)
      ? next
      : chooseComputerMove();
    state = applyMove(state, "opponent", opponentNumber);
    busy = false;
    render();
    if (state.status !== "playing") void finishGame();
  }, 850);
}

function chooseComputerMove(): number {
  const available = state.available;
  const opponentNumbers = state.moves.filter((move) => move.player === "opponent").map((move) => move.number);
  for (const candidate of available) {
    if (opponentNumbers.length >= 2 && opponentNumbers[0] + opponentNumbers[1] + candidate === 15) return candidate;
  }
  const yourNumbers = state.moves.filter((move) => move.player === "you").map((move) => move.number);
  for (const candidate of available) {
    if (yourNumbers.length >= 2 && yourNumbers[0] + yourNumbers[1] + candidate === 15) return candidate;
  }
  return available[Math.floor(Math.random() * available.length)] ?? 1;
}

async function finishGame(): Promise<void> {
  busy = false;
  try {
    ysdk?.features?.GameplayAPI?.stop();
    if (ysdk && onlineSession) await ysdk.multiplayer.sessions.push({ meta1: 0 });
  } catch {
    statusMessage = "Партия завершена. Не удалось сохранить её для будущих соперников.";
  }
  render();
}

function goMenu(): void {
  ysdk?.features?.GameplayAPI?.stop();
  mode = "menu";
  busy = false;
  render();
}

render();
void initYandex();

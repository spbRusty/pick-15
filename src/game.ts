export type Player = "you" | "opponent";
export type GameStatus = "playing" | "you-won" | "opponent-won" | "draw";

export interface Move {
  player: Player;
  number: number;
}

export interface GameState {
  moves: Move[];
  available: number[];
  turn: Player;
  status: GameStatus;
  winningLine: number[] | null;
}

export function createGame(): GameState {
  return {
    moves: [],
    available: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    turn: "you",
    status: "playing",
    winningLine: null,
  };
}

export function findWinningLine(numbers: number[]): number[] | null {
  for (let a = 0; a < numbers.length; a++) {
    for (let b = a + 1; b < numbers.length; b++) {
      for (let c = b + 1; c < numbers.length; c++) {
        if (numbers[a] + numbers[b] + numbers[c] === 15) {
          return [numbers[a], numbers[b], numbers[c]];
        }
      }
    }
  }
  return null;
}

export function applyMove(state: GameState, player: Player, number: number): GameState {
  if (state.status !== "playing" || state.turn !== player || !state.available.includes(number)) {
    return state;
  }

  const moves = [...state.moves, { player, number }];
  const available = state.available.filter((value) => value !== number);
  const selected = moves.filter((move) => move.player === player).map((move) => move.number);
  const winningLine = findWinningLine(selected);

  let status: GameStatus = "playing";
  if (winningLine) status = player === "you" ? "you-won" : "opponent-won";
  else if (available.length === 0) status = "draw";

  return {
    moves,
    available,
    turn: player === "you" ? "opponent" : "you",
    status,
    winningLine,
  };
}

export function readOpponentMoves(opponent: YaOpponent | undefined): number[] {
  if (!opponent?.timeline) return [];
  return opponent.timeline
    .map((event) => {
      const payload = event.payload;
      if (typeof payload === "object" && payload !== null && "number" in payload) {
        return Number((payload as { number: unknown }).number);
      }
      return NaN;
    })
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 9)
    .slice(0, 9);
}

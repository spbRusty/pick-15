interface YaPlayer {
  getName(): string;
  getPhoto?(size: string): string;
}

interface YaOpponent {
  id: string;
  player?: { name?: string; avatar?: string };
  timeline?: Array<{ id: number | string; payload?: unknown; time: number }>;
}

interface YaGamesSDK {
  getPlayer(options?: { scopes?: boolean }): Promise<YaPlayer>;
  multiplayer: {
    sessions: {
      init(options: {
        count: number;
        isEventBased: boolean;
        meta: { meta1: { min: number; max: number } };
      }): Promise<YaOpponent[]>;
      commit(payload: { type: "pick"; number: number }): void;
      push(meta: { meta1: number }): Promise<void> | void;
    };
  };
  features?: { GameplayAPI?: { start(): void; stop(): void } };
}

declare const YaGames: {
  init(): Promise<YaGamesSDK>;
};

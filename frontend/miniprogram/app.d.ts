import type { UserSummary } from "./types/models";

declare global {
  interface IAppOption {
    globalData: {
      apiBaseUrl: string;
      token: string;
      user: UserSummary | null;
    };
  }
}

export {};

import { create } from "zustand";
import { Log } from "../interface/log";
import { LogSettings } from "../interface/logSettings";
import { LogService } from "../service/LogService";

interface LogState {
  logs: Log[];
  logSettings: LogSettings | null;
  listenToLogs: () => () => void;
  listenToLogSettings: () => () => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  logSettings: null,
  listenToLogs: () => LogService.listenToLogs((logs) => set({ logs })),
  listenToLogSettings: () =>
    LogService.listenToLogSettings((logSettings) => set({ logSettings })),
}));

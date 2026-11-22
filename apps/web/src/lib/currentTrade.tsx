import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Trade } from "../api/types";
import { loadValue, saveValue } from "./storage";
import { DEFAULT_TRADE, TRADE_THEMES } from "./trades";

const TRADE_KEY = "smartcraft.trade";

type CurrentTrade = { trade: Trade; setTrade: (trade: Trade) => void };

const Ctx = createContext<CurrentTrade | null>(null);

function initialTrade(): Trade {
  const stored = loadValue(TRADE_KEY);
  return stored in TRADE_THEMES ? (stored as Trade) : DEFAULT_TRADE;
}

/** Gewählter Beruf – wie in V2 gemerkt und app-weit für die Akzentfarbe genutzt. */
export function CurrentTradeProvider({ children }: { children: ReactNode }) {
  const [trade, setTradeState] = useState<Trade>(initialTrade);
  const setTrade = useCallback((next: Trade) => {
    setTradeState(next);
    saveValue(TRADE_KEY, next);
  }, []);
  const value = useMemo(() => ({ trade, setTrade }), [trade, setTrade]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrentTrade(): CurrentTrade {
  const value = useContext(Ctx);
  if (!value) throw new Error("CurrentTradeProvider fehlt");
  return value;
}

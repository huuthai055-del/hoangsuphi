"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionContextValue = Readonly<{
  status: SessionStatus;
  isAuthenticated: boolean;
  refreshSession: () => Promise<SessionStatus>;
  markAuthenticated: () => void;
  markAnonymous: () => void;
}>;

const SessionContext = createContext<SessionContextValue | null>(null);

async function readSessionStatus(signal?: AbortSignal): Promise<SessionStatus> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      return "anonymous";
    }

    const payload = (await response.json()) as unknown;
    if (
      typeof payload === "object" &&
      payload !== null &&
      "data" in payload &&
      typeof payload.data === "object" &&
      payload.data !== null &&
      "authenticated" in payload.data &&
      payload.data.authenticated === true
    ) {
      return "authenticated";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
  }

  return "anonymous";
}

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshSession = useCallback(async () => {
    const nextStatus = await readSessionStatus();
    setStatus(nextStatus);
    return nextStatus;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    readSessionStatus(controller.signal)
      .then(setStatus)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("anonymous");
        }
      });

    return () => controller.abort();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      isAuthenticated: status === "authenticated",
      refreshSession,
      markAuthenticated: () => setStatus("authenticated"),
      markAnonymous: () => setStatus("anonymous"),
    }),
    [refreshSession, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

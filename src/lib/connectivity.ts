/**
 * Connectivity mode: the one rule that decides whether the app talks to the server.
 * Previously this expression was repeated in the facility layout, its route guard,
 * the automation tick and the offline page.
 *
 *   online          navigator.onLine and manual offline is off  -> server calls allowed
 *   manual-offline  user flipped "Manual offline mode"          -> device workspace only
 *   offline         the browser reports no network              -> device workspace only
 */
export const MANUAL_OFFLINE_KEY = "medicare-manual-offline";
export const OFFLINE_CHANGE_EVENT = "medicare-offline-change";

export type ConnectivityMode = "online" | "manual-offline" | "offline";

export function connectivityMode(
  browserOnline: boolean = typeof navigator === "undefined" ? true : navigator.onLine,
  manual: boolean = readManualOffline(),
): ConnectivityMode {
  if (manual) return "manual-offline";
  return browserOnline ? "online" : "offline";
}

export function readManualOffline(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MANUAL_OFFLINE_KEY) === "true";
  } catch {
    return false;
  }
}

/** True when server calls are allowed. */
export const isConnected = () => connectivityMode() === "online";

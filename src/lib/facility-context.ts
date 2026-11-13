import { createContext, useContext } from "react";
import type { Network } from "@/lib/network";

type FacilityContextValue = {
  net: Network | undefined;
  scope: string;
  setScope: (scope: string) => void;
};

export const FacilityCtx = createContext<FacilityContextValue>({
  net: undefined,
  scope: "all",
  setScope: () => {},
});

export const useFacilityCtx = () => useContext(FacilityCtx);

// @Architecture(descriptionShort="Shared inspector width for panel chrome and resize handle")
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export const DEFAULT_INSPECTOR_WIDTH = 280;
export const MIN_INSPECTOR_WIDTH = 200;
export const MAX_INSPECTOR_WIDTH = 720;

type InspectorLayout = {
  width: number;
  setWidth: (width: number) => void;
};

const InspectorLayoutContext = createContext<InspectorLayout | null>(null);

export function InspectorLayoutProvider({
  width,
  setWidth,
  children,
}: InspectorLayout & { children: ReactNode }) {
  return (
    <InspectorLayoutContext.Provider value={{ width, setWidth }}>
      {children}
    </InspectorLayoutContext.Provider>
  );
}

export function useInspectorLayout(): InspectorLayout {
  const ctx = useContext(InspectorLayoutContext);
  if (!ctx) {
    throw new Error("useInspectorLayout must be used within InspectorLayoutProvider");
  }
  return ctx;
}

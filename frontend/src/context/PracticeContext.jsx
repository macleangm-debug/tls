// frontend/src/context/PracticeContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const PracticeContext = createContext(null);
const STORAGE_KEY = "practice_context_v1";

export function PracticeContextProvider({ user, children }) {
  const [availableContexts, setAvailableContexts] = useState([]);
  const [activeContextId, setActiveContextId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const contexts = [
      {
        id: "personal",
        type: "personal",
        label: "Personal Practice",
      },
      ...((user.organizations || []).map((org) => ({
        id: `org_${org.id}`,
        type: "organization",
        organizationId: org.id,
        label: org.name,
      }))),
    ];

    setAvailableContexts(contexts);

    const saved = localStorage.getItem(STORAGE_KEY);
    const savedExists = contexts.find((ctx) => ctx.id === saved);

    if (savedExists) {
      setActiveContextId(saved);
    } else {
      setActiveContextId(contexts[0]?.id || null);
    }
  }, [user]);

  useEffect(() => {
    if (activeContextId) {
      localStorage.setItem(STORAGE_KEY, activeContextId);
    }
  }, [activeContextId]);

  const activeContext = useMemo(
    () => availableContexts.find((ctx) => ctx.id === activeContextId) || null,
    [availableContexts, activeContextId]
  );

  const value = useMemo(
    () => ({
      availableContexts,
      activeContext,
      activeContextId,
      setActiveContextId,
      isPersonal: activeContext?.type === "personal",
      isOrganization: activeContext?.type === "organization",
      organizationId: activeContext?.organizationId || null,
    }),
    [availableContexts, activeContext, activeContextId]
  );

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePracticeContext() {
  const ctx = useContext(PracticeContext);
  if (!ctx) {
    throw new Error("usePracticeContext must be used inside PracticeContextProvider");
  }
  return ctx;
}

// Safe hook that returns null instead of throwing if outside provider
export function usePracticeContextSafe() {
  return useContext(PracticeContext);
}

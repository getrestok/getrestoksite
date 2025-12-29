import { create } from "zustand";

type OrgState = {
  orgId: string | null;
  plan: string | null;
  role: "owner" | "admin" | "member" | null;

  items: any[];
  vendors: any[];
  members: any[];
  locations: any[];

  loading: boolean;

  setState: (data: Partial<OrgState>) => void;
  reset: () => void;
};

export const useOrgStore = create<OrgState>((set) => ({
  orgId: null,
  plan: null,
  role: null,

  items: [],
  vendors: [],
  members: [],
  locations: [],

  loading: true,

  setState: (data) => set((s) => ({ ...s, ...data })),
  reset: () =>
    set({
      orgId: null,
      plan: null,
      role: null,
      items: [],
      vendors: [],
      members: [],
      locations: [],
      loading: true,
    }),
}));
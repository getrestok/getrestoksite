import { useOrgStore } from "@/lib/orgStore";

export function useOrgData() {
  const {
    orgId,
    plan,
    role,
    items,
    vendors,
    members,
    loading,
    locations,
  } = useOrgStore();

  return {
    orgId,
    plan,
    role,
    items,
    vendors,
    members,
    loading,
    locations,
  };
}
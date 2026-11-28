import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProfileFace } from "../components/ProfileHeader";

/**
 * F2: what the profile header shows for a live space: the caller's Top 8 (with
 * the "why" for each face), the visitor counter, and the visit this tab records
 * once it is inside (the server keeps it to one per member per 30 minutes).
 */
export function useSpaceProfile(spaceId: Id<"spaces"> | undefined, entered: boolean) {
  const active = spaceId && entered ? { spaceId } : "skip";
  const top = useQuery(api.top8.mine, active);
  const counter = useQuery(api.visits.counter, active);
  const recordVisit = useMutation(api.visits.recordVisit);

  useEffect(() => {
    if (!spaceId || !entered) return;
    void recordVisit({ spaceId }).catch(() => {});
  }, [spaceId, entered, recordVisit]);

  const faces: ProfileFace[] | undefined = top?.map((m) => ({
    key: m.userId,
    name: m.name,
    color: m.color,
    emoji: m.emoji,
    avatarUrl: m.avatarUrl,
    why: m.why,
  }));
  return {
    top8: faces,
    visitors: counter?.totalVisits,
    visitorsDetail: counter
      ? `${counter.distinctMembers} ${counter.distinctMembers === 1 ? "person" : "people"}, ${counter.totalVisits} visits`
      : undefined,
  };
}

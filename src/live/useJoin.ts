import { useCallback, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * "Join" with Google (the only account provider; guests are anonymous).
 *
 * Joining never forks the person. The server patches the email onto the
 * guest's existing row and hands back the same user id, so the name, colour,
 * votes and memberships they already have just keep working (A1: upgrade,
 * don't fork). Nothing here has to migrate anything.
 */
export function useJoin() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Google: a redirect round-trip. The page leaves, Google asks, the page
     comes back with ?code= and ConvexAuthProvider finishes the sign-in. We
     hand it our own full URL so the room (and a localhost dev server) is
     where you land. */
  const google = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn("google", { redirectTo: window.location.href });
    } catch {
      setError("google didn't answer. try again?");
      setBusy(false);
    }
  }, [signIn]);

  return { busy, error, google };
}

/**
 * Who the visitor is to the backend: a guest, or someone who joined.
 * `undefined` while the query is in flight, so callers treat that as "guest",
 * because the canvas renders for everyone either way.
 */
export function useAccount() {
  const user = useQuery(api.auth.currentUser, {});
  return {
    loading: user === undefined,
    joined: user?.isAnonymous === false,
    email: user?.email,
  };
}
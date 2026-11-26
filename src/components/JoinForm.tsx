import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useJoin } from "../live/useJoin";

/**
 * The join form: Google is the only way to keep a guest seat across devices.
 * Lives inside the claim card. The page leaves for Google and comes back
 * signed in, so there is no "done" step here.
 *
 * Deliberately not a wall. Every copy line here is about keeping what you
 * already have, never about unlocking the app (A1).
 */
export function JoinForm({
  reason,
  title = "keep this",
  onCancel,
}: {
  /** One line saying why this is worth doing, in the voice of the moment. */
  reason: string;
  /** The kicker over the form: "keep this" for a guest, "sign in" for a return. */
  title?: string;
  /** Kept for callers that still pass it; the page reloads on return. */
  onJoined?: () => void;
  onCancel?: () => void;
}) {
  const { busy, error, google } = useJoin();
  const options = useQuery(api.auth.signInOptions, {});

  return (
    <div className="join-form">
      <span className="claim-card-kicker">{title}</span>
      <p className="join-form-reason">
        {options && !options.google ? "signing in isn't set up on this deployment." : reason}
      </p>

      {error && <span className="join-form-error">{error}</span>}

      {options?.google && (
        <button
          type="button"
          className="join-google"
          disabled={busy}
          onClick={() => void google()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" fill="#4285F4" />
            <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
            <path d="M6.4 14a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.5Z" fill="#FBBC04" />
            <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.8 9.4 6 12 6Z" fill="#EA4335" />
          </svg>
          continue with Google
        </button>
      )}

      <button type="button" className="join-form-back" onClick={() => onCancel?.()}>
        not now
      </button>
    </div>
  );
}
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { AWAY_MESSAGE_MAX, buddyStatus, cleanAwayMessage, doorEvents } from "./buddy";

describe("buddy", () => {
  it("offline wins over everything", () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: undefined }), fc.option(fc.nat(), { nil: undefined }), (m, idle) => {
        expect(buddyStatus({ online: false, awayMessage: m, idleSince: idle })).toBe("offline");
      }),
    );
  });

  it("away by message or by idle, else online", () => {
    expect(buddyStatus({ online: true })).toBe("online");
    expect(buddyStatus({ online: true, awayMessage: "brb" })).toBe("away");
    expect(buddyStatus({ online: true, awayMessage: "  " })).toBe("online");
    expect(buddyStatus({ online: true, idleSince: 5 })).toBe("away");
  });

  it("cleans away messages to at most 80 chars", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (s) => {
        const out = cleanAwayMessage(s);
        expect(out.length).toBeLessThanOrEqual(AWAY_MESSAGE_MAX);
        expect(out).toBe(out.trim());
        expect(cleanAwayMessage(out)).toBe(out);
      }),
    );
  });

  it("door events skip self and the first sighting", () => {
    const prev = new Map([["a", true], ["b", false], ["me", true]]);
    const cur = new Map([["a", false], ["b", true], ["me", false], ["new", true]]);
    expect(doorEvents(prev, cur, "me").sort()).toEqual(["join", "leave"]);
    expect(doorEvents(new Map(), cur, "me")).toEqual([]);
  });
});

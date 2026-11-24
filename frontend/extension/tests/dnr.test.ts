import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DNR_RULES, EXCLUDED_INITIATOR_DOMAINS } from "../src/rules/dnr";

describe("Declarative Net Request (DNR) Rules Scoping (#49)", () => {
  it("defines 7 dynamic rules with unique IDs and priorities", () => {
    assert.equal(DNR_RULES.length, 7);
    const ids = new Set(DNR_RULES.map((r) => r.id));
    assert.equal(ids.size, 7);
  });

  it("exports EXCLUDED_INITIATOR_DOMAINS containing native YouTube domains", () => {
    assert.ok(EXCLUDED_INITIATOR_DOMAINS.includes("youtube.com"));
    assert.ok(EXCLUDED_INITIATOR_DOMAINS.includes("music.youtube.com"));
    assert.ok(EXCLUDED_INITIATOR_DOMAINS.includes("googlevideo.com"));
  });

  it("scopes all rules with excludedInitiatorDomains so native YouTube is not broken", () => {
    for (const rule of DNR_RULES) {
      assert.ok(
        rule.condition.excludedInitiatorDomains,
        `Rule ${rule.id} must define excludedInitiatorDomains`
      );
      assert.ok(
        rule.condition.excludedInitiatorDomains.includes("youtube.com"),
        `Rule ${rule.id} must exclude youtube.com`
      );
      assert.ok(
        rule.condition.excludedInitiatorDomains.includes("music.youtube.com"),
        `Rule ${rule.id} must exclude music.youtube.com`
      );
    }
  });

  it("ensures media stream rules 6 and 7 exclude native youtube.com to prevent video breakage", () => {
    const streamRule = DNR_RULES.find((r) => r.id === 6);
    assert.ok(streamRule);
    assert.equal(streamRule.condition.urlFilter, "||googlevideo.com/");
    assert.ok(streamRule.condition.excludedInitiatorDomains?.includes("youtube.com"));

    const visionRule = DNR_RULES.find((r) => r.id === 7);
    assert.ok(visionRule);
    assert.equal(visionRule.condition.urlFilter, "||googlevideo.com/*c=VISIONOS");
    assert.ok(visionRule.condition.excludedInitiatorDomains?.includes("youtube.com"));
  });
});

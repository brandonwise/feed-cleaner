import { describe, it, expect } from "vitest";
import { detectAll } from "../index";
import type { TweetData } from "../../shared/types";

function makeTweet(overrides: Partial<TweetData> = {}): TweetData {
  const text = overrides.text ?? "Normal post about shipping a feature today";
  return {
    element: {} as HTMLElement,
    tweetId: "pipeline-1",
    text,
    authorHandle: "builderdev",
    authorDisplayName: "Builder Dev",
    isVerified: false,
    isVerifiedOrg: false,
    isPromoted: false,
    isQuoteTweet: false,
    quotedText: null,
    isReply: false,
    isThread: false,
    hasMedia: false,
    hasExternalLink: false,
    linkDomains: [],
    wordCount: text.split(/\s+/).length,
    ...overrides,
  };
}

describe("Detection pipeline smoke checks", () => {
  it("flags affiliate funnel content through detectAll()", () => {
    const result = detectAll(
      makeTweet({
        text: 'Paid partnership. I made $3k/week with TikTok Shop dropshipping. DM me "guide".',
        linkDomains: ["linktr.ee"],
        hasExternalLink: true,
        wordCount: 14,
      }),
    );

    expect(result.flags.some((flag) => flag.category === "ad")).toBe(true);
  });

  it("returns no flags for plain status update", () => {
    const result = detectAll(
      makeTweet({
        text: "Wrapped up sprint planning and heading into implementation now.",
        wordCount: 9,
      }),
    );

    expect(result.flags).toHaveLength(0);
  });

  it("flags keyword-comment affiliate slideshow funnels end-to-end", () => {
    const result = detectAll(
      makeTweet({
        text: 'Comment "SLIDES" to get my TikTok Shop setup. Link in bio.',
        linkDomains: ["shopmy.us"],
        hasExternalLink: true,
        wordCount: 11,
      }),
    );

    const adFlag = result.flags.find((flag) => flag.category === "ad");
    expect(adFlag).toBeDefined();
    expect(adFlag!.signals.some((signal) => signal.name === "keyword_comment_gate")).toBe(true);
    expect(adFlag!.signals.some((signal) => signal.name === "monetization_link")).toBe(true);
  });
});

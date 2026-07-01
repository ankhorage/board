import { describe, expect, it } from "bun:test";

import type { WebBoardingPlan } from "../src/webBoardingPlan.js";
import {
  extractWebsiteSignals,
  inspectWebsite,
  renderWebBoardingPlan,
} from "../src/webInspection.js";

const EXAMPLE_HTML = `<!doctype html>
<html>
  <head>
    <title>Example Domain</title>
    <meta name="description" content="Fixture description" />
  </head>
  <body>
    <main aria-label="Hero">
      <h1>Example Domain</h1>
      <section aria-label="Overview">
        <h2>Overview</h2>
      </section>
      <a href="/about">About</a>
      <a href="https://iana.org/domains/example">More information</a>
    </main>
  </body>
</html>`;

describe("inspectWebsite", () => {
  it("produces a deterministic single-route plan from static HTML", async () => {
    let fetchCalls = 0;
    const result = await inspectWebsite("https://example.com", {
      fetchImplementation: () => {
        fetchCalls += 1;
        const response = new Response(EXAMPLE_HTML, {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
          status: 200,
        });
        Object.defineProperty(response, "url", {
          configurable: true,
          value: "https://example.com/",
        });
        return Promise.resolve(response);
      },
    });

    const expectedPlan = {
      app: {
        suggestedName: "Example Domain",
        suggestedSlug: "example-domain",
      },
      diagnostics: [],
      kind: "web-boarding-plan",
      observedLinks: [
        {
          href: "/about",
          label: "About",
          sameOrigin: true,
        },
        {
          href: "https://iana.org/domains/example",
          label: "More information",
          sameOrigin: false,
        },
      ],
      routes: [
        {
          description: "Fixture description",
          headings: ["Example Domain", "Overview"],
          path: "/",
          sections: ["Hero", "Overview"],
          sourceUrl: "https://example.com/",
          title: "Example Domain",
        },
      ],
      source: {
        fetchedUrl: "https://example.com/",
        kind: "website",
        url: "https://example.com/",
      },
      version: 1,
    } as const satisfies WebBoardingPlan;

    expect(result.exitCode).toBe(0);
    expect(fetchCalls).toBe(1);
    expect(result.plan).toEqual(expectedPlan);
    expect(JSON.parse(renderWebBoardingPlan(result.plan))).toEqual(
      expectedPlan,
    );
    expect(result.plan.routes).toHaveLength(1);
  });

  it("returns a diagnostic plan for network failures", async () => {
    const result = await inspectWebsite("https://example.com", {
      fetchImplementation: () => {
        throw new Error("offline");
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.plan.diagnostics).toEqual([
      {
        code: "website-fetch-failed",
        message: "Could not fetch the requested website URL.",
        severity: "error",
      },
    ]);
    expect(result.plan.routes).toEqual([
      {
        headings: [],
        path: "/",
        sections: [],
        sourceUrl: "https://example.com/",
      },
    ]);
  });

  it("returns a diagnostic plan for unsupported content types", async () => {
    const result = await inspectWebsite("https://example.com", {
      fetchImplementation: () =>
        Promise.resolve(
          new Response("not html", {
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
    });

    expect(result.exitCode).toBe(1);
    expect(result.plan.diagnostics).toEqual([
      {
        code: "website-unsupported-content-type",
        message: "The requested website URL did not return HTML content.",
        severity: "error",
      },
    ]);
    expect(result.plan.routes).toHaveLength(1);
  });

  it("returns a diagnostic plan when HTML extraction fails", async () => {
    const result = await inspectWebsite("https://example.com", {
      extractWebsiteSignals() {
        throw new Error("broken parser");
      },
      fetchImplementation: () =>
        Promise.resolve(
          new Response(EXAMPLE_HTML, {
            headers: {
              "content-type": "text/html",
            },
          }),
        ),
    });

    expect(result.exitCode).toBe(1);
    expect(result.plan.diagnostics).toEqual([
      {
        code: "website-parse-failed",
        message: "The requested website HTML could not be inspected.",
        severity: "error",
      },
    ]);
    expect(result.plan.routes).toHaveLength(1);
  });

  it("treats observed links as metadata only", () => {
    const extracted = extractWebsiteSignals(
      EXAMPLE_HTML,
      new URL("https://example.com/"),
    );

    expect(extracted.observedLinks).toEqual([
      {
        href: "/about",
        label: "About",
        sameOrigin: true,
      },
      {
        href: "https://iana.org/domains/example",
        label: "More information",
        sameOrigin: false,
      },
    ]);
  });
});

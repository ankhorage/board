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

  it("returns a diagnostic plan for timeouts", async () => {
    const result = await inspectWebsite("https://example.com", {
      fetchImplementation: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Timed out", "AbortError"));
            },
            { once: true },
          );
        }),
      timeoutMs: 1,
    });

    expect(result.exitCode).toBe(1);
    expect(result.plan.diagnostics).toEqual([
      {
        code: "website-fetch-timeout",
        message: "Fetching the requested website URL timed out.",
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
    expect(JSON.parse(renderWebBoardingPlan(result.plan))).toEqual(result.plan);
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

  it("returns a diagnostic plan for oversized responses declared by content-length", async () => {
    const result = await inspectWebsite("https://example.com", {
      fetchImplementation: () =>
        Promise.resolve(
          new Response(EXAMPLE_HTML, {
            headers: {
              "content-length": "999999",
              "content-type": "text/html; charset=utf-8",
            },
          }),
        ),
      maxResponseBytes: 32,
    });

    expect(result.exitCode).toBe(1);
    expect(result.plan.diagnostics).toEqual([
      {
        code: "website-response-too-large",
        message: "The requested website response exceeded the size limit.",
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

  it("rejects oversized responses while reading when content-length is absent", async () => {
    let pullCount = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1;
        if (pullCount === 1) {
          controller.enqueue(new TextEncoder().encode("123456789"));
          return;
        }

        controller.enqueue(new TextEncoder().encode("abcdefghi"));
        controller.close();
      },
    });

    const result = await inspectWebsite("https://example.com", {
      fetchImplementation: () =>
        Promise.resolve(
          new Response(body, {
            headers: {
              "content-type": "text/html; charset=utf-8",
            },
          }),
        ),
      maxResponseBytes: 10,
    });

    expect(result.exitCode).toBe(1);
    expect(result.plan.diagnostics).toEqual([
      {
        code: "website-response-too-large",
        message: "The requested website response exceeded the size limit.",
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
    expect(pullCount).toBe(2);
    const parsedPlan: unknown = JSON.parse(renderWebBoardingPlan(result.plan));
    expect(parsedPlan).toEqual(result.plan);
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

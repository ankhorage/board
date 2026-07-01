import { readFileSync } from "node:fs";

import {
  inspectWebsite,
  type InspectWebsiteOptions,
  type InspectWebsiteResult,
} from "./webInspection.js";

export interface BoardCommandServices {
  inspectWebsite(options: {
    readonly url: string;
  }): Promise<InspectWebsiteResult>;
}

export function createDefaultBoardCommandServices(
  env: Readonly<Record<string, string | undefined>>,
): BoardCommandServices {
  const fixturePath = env.ANKHORAGE_BOARD_TEST_WEB_FIXTURE_PATH;
  const fixtureResponseUrl = env.ANKHORAGE_BOARD_TEST_WEB_FIXTURE_RESPONSE_URL;
  const fixtureContentType =
    env.ANKHORAGE_BOARD_TEST_WEB_FIXTURE_CONTENT_TYPE ??
    "text/html; charset=utf-8";
  const fixtureStatus = parseFixtureStatus(
    env.ANKHORAGE_BOARD_TEST_WEB_FIXTURE_STATUS,
  );

  const inspectWebsiteOptions: InspectWebsiteOptions =
    fixturePath === undefined
      ? {}
      : {
          fetchImplementation: (input) => {
            const requestUrl =
              typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.toString()
                  : input.url;

            const response = new Response(readFileSync(fixturePath, "utf8"), {
              headers: {
                "content-type": fixtureContentType,
              },
              status: fixtureStatus,
            });

            Object.defineProperty(response, "url", {
              configurable: true,
              value: fixtureResponseUrl ?? requestUrl,
            });

            return Promise.resolve(response);
          },
        };

  return {
    inspectWebsite({ url }) {
      return inspectWebsite(url, inspectWebsiteOptions);
    },
  };
}

function parseFixtureStatus(value: string | undefined): number {
  if (value === undefined) {
    return 200;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 200;
}

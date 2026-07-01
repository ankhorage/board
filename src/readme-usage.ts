import { runCli } from "./cli.js";

/***
 * Website-source boarding
 *
 * `@ankhorage/board` is the future home for website and source boarding into
 * Ankhorage.
 *
 * `ankhorage/board#2` implements the first real website-source boarding slice.
 * `board web <url>` now inspects a single public website URL and emits a
 * deterministic `WebBoardingPlan` JSON document.
 *
 * Current explicit commands are:
 *
 * - `board web <url>`
 * - `board web <url> --plan`
 * - `board openapi <source>`
 * - `board manifest generate <source>`
 *
 * `board web <url>` and `board web <url> --plan` produce the same JSON plan.
 *
 * `board web <url> --create <project>` is parsed only to return a deferred
 * message in this slice. OpenAPI import, standalone manifest generation,
 * project creation, crawling, and root CLI sugar remain deferred.
 *
 * Root CLI sugar such as `ankh board <url>` or `ankh board --url <url>` is
 * deferred.
 *
 * @usage
 */
await runCli(["--help"]);

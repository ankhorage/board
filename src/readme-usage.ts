import { runCli } from "./cli.js";

/***
 * Bootstrap status
 *
 * `@ankhorage/board` is the future home for website and source boarding into
 * Ankhorage.
 *
 * `ankhorage/board#1` is intentionally bootstrap-only. It establishes the
 * package shape, provider metadata, explicit command table, shared runner, and
 * standalone CLI surface without implementing the real boarding pipeline yet.
 *
 * Current explicit commands are:
 *
 * - `board web <source>`
 * - `board openapi <source>`
 * - `board manifest generate <source>`
 *
 * Root CLI sugar such as `ankh board <url>` or `ankh board --url <url>` is
 * deferred. The first real website boarding pipeline is deferred to
 * `ankhorage/board#2`.
 *
 * @usage
 */
runCli(["--help"]);

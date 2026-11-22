import { runCli } from '../../src/cli/index.js';

/***
 * Website-source boarding
 *
 * `@ankhorage/board` inspects a single public website URL and emits a
 * deterministic `WebBoardingPlan` JSON document through its standalone CLI.
 *
 * Current standalone commands are `board web <url>`, `board web <url> --plan`,
 * `board openapi <source>`, and `board manifest generate <source>`. Root
 * planning is available through `ankh plan board web <url>` and produces a
 * generic `AnkhCommandPlan` without calling Board execution handlers.
 *
 * Project creation, crawling, and root CLI sugar remain deferred.
 *
 * @title Website-source boarding
 * @usage
 * @readme
 */
await runCli(['--help']);

import type {
  AnkhCommandPlan,
  AnkhCommandPlanDiagnostic,
  AnkhPlanningHandlerBinding,
  AnkhPlanningRequest,
} from "@ankhorage/ankh";

import { createDefaultBoardCommandServices } from "./commandServices.js";
import type { WebBoardingPlan } from "./webBoardingPlan.js";

export function createProviderPlanningHandlers(): readonly AnkhPlanningHandlerBinding[] {
  return [
    {
      path: ["web"],
      handler: async (request) => await planBoardWebCommand(request),
    },
  ];
}

async function planBoardWebCommand(
  request: AnkhPlanningRequest,
): Promise<AnkhCommandPlan> {
  const parsed = parseBoardWebPlanningArgs(request.argv);
  if (parsed.kind === "error") {
    return createInvalidRequestPlan({
      code: parsed.code,
      message: parsed.message,
      providerId: request.provider.manifest.id,
    });
  }

  const services = createDefaultBoardCommandServices(request.context.env);
  const result = await services.inspectWebsite({
    url: parsed.url,
  });

  return createBoardWebCommandPlan({
    plan: result.plan,
    providerId: request.provider.manifest.id,
  });
}

type ParsedBoardWebPlanningArgs =
  | {
      readonly kind: "ok";
      readonly url: string;
    }
  | {
      readonly code: string;
      readonly kind: "error";
      readonly message: string;
    };

function parseBoardWebPlanningArgs(
  argv: readonly string[],
): ParsedBoardWebPlanningArgs {
  let sourceUrl: string | null = null;

  for (const token of argv) {
    if (token === "--plan") {
      continue;
    }

    if (token === "--create") {
      return {
        code: "board-web-create-deferred",
        kind: "error",
        message:
          "Project creation from a board web plan is deferred. Use `ankh plan board web <url>` to inspect the plan.",
      };
    }

    if (token.startsWith("--")) {
      return {
        code: "board-web-unsupported-flag",
        kind: "error",
        message: `Unsupported board web planning flag: ${token}`,
      };
    }

    if (sourceUrl !== null) {
      return {
        code: "board-web-too-many-urls",
        kind: "error",
        message: "board web planning accepts exactly one website URL.",
      };
    }

    sourceUrl = token;
  }

  if (sourceUrl === null || sourceUrl.trim().length === 0) {
    return {
      code: "board-web-url-missing",
      kind: "error",
      message: "Usage: ankh plan board web <url>",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return {
      code: "board-web-invalid-url",
      kind: "error",
      message:
        "board web planning requires a syntactically valid absolute website URL.",
    };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      code: "board-web-unsupported-url-scheme",
      kind: "error",
      message:
        "board web planning supports only absolute http:// or https:// website URLs.",
    };
  }

  return {
    kind: "ok",
    url: parsedUrl.toString(),
  };
}

function createInvalidRequestPlan(args: {
  readonly code: string;
  readonly message: string;
  readonly providerId: string;
}): AnkhCommandPlan {
  return {
    diagnostics: [
      {
        code: args.code,
        message: args.message,
        severity: "error",
        stepId: "inspect-website",
      },
    ],
    kind: "ankh-command-plan",
    steps: [
      {
        capability: "board.web.import",
        dependsOn: [],
        destructive: false,
        id: "inspect-website",
        label: "Inspect website source",
        providerId: args.providerId,
        status: "blocked",
      },
      {
        capability: "board.manifest.generate",
        dependsOn: ["inspect-website"],
        destructive: false,
        id: "draft-ankhorage-manifest",
        label: "Draft Ankhorage project manifest",
        providerId: args.providerId,
        status: "blocked",
      },
    ],
    title: "Board website source",
    version: 1,
  };
}

function createBoardWebCommandPlan(args: {
  readonly plan: WebBoardingPlan;
  readonly providerId: string;
}): AnkhCommandPlan {
  const hasErrors = args.plan.diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const inspectStatus = hasErrors ? "blocked" : "planned";
  const manifestStatus = hasErrors ? "blocked" : "planned";

  return {
    diagnostics: args.plan.diagnostics.map(toCommandPlanDiagnostic),
    kind: "ankh-command-plan",
    steps: [
      {
        capability: "board.web.import",
        dependsOn: [],
        destructive: false,
        id: "inspect-website",
        inputs: {
          source: args.plan.source,
        },
        label: "Inspect website source",
        outputs: {
          observedLinks: args.plan.observedLinks,
          routes: args.plan.routes,
        },
        providerId: args.providerId,
        status: inspectStatus,
      },
      {
        capability: "board.manifest.generate",
        dependsOn: ["inspect-website"],
        destructive: false,
        id: "draft-ankhorage-manifest",
        inputs: {
          app: args.plan.app,
          routes: args.plan.routes,
        },
        label: "Draft Ankhorage project manifest",
        outputs: {
          suggestedName: args.plan.app.suggestedName,
          suggestedSlug: args.plan.app.suggestedSlug,
        },
        providerId: args.providerId,
        status: manifestStatus,
      },
    ],
    title: `Board website source: ${args.plan.source.url}`,
    version: 1,
  };
}

function toCommandPlanDiagnostic(
  diagnostic: WebBoardingPlan["diagnostics"][number],
): AnkhCommandPlanDiagnostic {
  return {
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    stepId: "inspect-website",
  };
}

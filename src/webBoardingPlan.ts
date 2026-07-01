export interface WebBoardingDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

interface WebBoardingSource {
  readonly fetchedUrl?: string;
  readonly kind: "website";
  readonly url: string;
}

interface WebBoardingAppSuggestion {
  readonly suggestedName: string;
  readonly suggestedSlug: string;
}

export interface WebBoardingRoute {
  readonly description?: string;
  readonly headings: readonly string[];
  readonly path: string;
  readonly sections: readonly string[];
  readonly sourceUrl: string;
  readonly title?: string;
}

export interface WebBoardingObservedLink {
  readonly href: string;
  readonly label?: string;
  readonly sameOrigin: boolean;
}

export interface WebBoardingPlan {
  readonly app: WebBoardingAppSuggestion;
  readonly diagnostics: readonly WebBoardingDiagnostic[];
  readonly kind: "web-boarding-plan";
  readonly observedLinks: readonly WebBoardingObservedLink[];
  readonly routes: readonly [WebBoardingRoute];
  readonly source: WebBoardingSource;
  readonly version: 1;
}

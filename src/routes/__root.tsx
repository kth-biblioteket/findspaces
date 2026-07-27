import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import i18n from "@/i18n";

import appCss from "../styles.css?url";
import ToasterMount from "@/components/ToasterMount";
import "@/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-foreground" aria-hidden="true">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hitta studieplats – KTH Biblioteket" },
      { name: "description", content: "Hitta och boka studieplatser på KTH Biblioteket." },
      { property: "og:title", content: "Hitta studieplats – KTH Biblioteket" },
      { name: "twitter:title", content: "Hitta studieplats – KTH Biblioteket" },
      { property: "og:description", content: "Hitta och boka studieplatser på KTH Biblioteket." },
      { name: "twitter:description", content: "Hitta och boka studieplatser på KTH Biblioteket." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/82dfa793-2d3b-4ad3-8059-47e9136ac835/id-preview-3174cfc2--bd232791-3127-4a42-9cbf-7f94edef314e.lovable.app-1780037611269.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/82dfa793-2d3b-4ad3-8059-47e9136ac835/id-preview-3174cfc2--bd232791-3127-4a42-9cbf-7f94edef314e.lovable.app-1780037611269.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Keep <html lang> in sync with the active language so screen readers
  // pronounce content correctly when the user switches language.
  useEffect(() => {
    const apply = (lng: string) => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = lng;
      }
    };
    apply(i18n.resolvedLanguage ?? "sv");
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Skip-to-content link — visible on focus for keyboard users */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {i18n.t("a11y.skip_to_content")}
      </a>
      <Outlet />
      <ToasterMount />
    </QueryClientProvider>
  );
}

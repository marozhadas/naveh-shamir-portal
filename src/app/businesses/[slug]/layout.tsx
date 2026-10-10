import { notFound } from "next/navigation";
import { resolveBusinessView } from "./resolve-business-view";

type BusinessSlugLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Gives a slug that does not exist a real HTTP 404.
 *
 * Why this file exists: loading.tsx puts the page behind a Suspense boundary, so the response starts streaming (status
 * 200) before the page gets to call notFound() — a missing business used to answer 200 with the "not found" screen
 * (a soft 404), and an old-slug permanentRedirect() became a client-side redirect instead of a real 308. A layout runs
 * ABOVE that boundary, before anything is streamed, so the status code can still be set.
 *
 * It asks the same question the page asks (resolveBusinessView — one source of truth, de-duplicated per request) and
 * acts ONLY on "not-found":
 *   - not-found    → notFound() → 404
 *   - old slug     → resolveBusinessView itself throws permanentRedirect() → 308 (unchanged logic, now before streaming)
 *   - published / owner or admin preview (pending, draft…) / unavailable → render exactly as before; nothing here
 *     decides who may see what — the page still does, with the same loading state.
 */
export default async function BusinessSlugLayout({ children, params }: BusinessSlugLayoutProps) {
  const { slug } = await params;
  const view = await resolveBusinessView(slug);
  if (view.kind === "not-found") notFound();
  return children;
}

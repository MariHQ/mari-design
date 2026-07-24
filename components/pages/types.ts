import type { ComponentType } from "react";

/** A named visual state of a page (default / loading / error / empty / edge).
    States are a CANVAS concept: they select which fixture the design canvas
    feeds a page. A page itself knows nothing about them. */
export type PageStateDef = { id: string; label: string };

/** Props every page component receives.

    Pages are pure presenters over real data. They carry NO demo data of their
    own: `data` is required, and a consuming app passes whatever its API
    returned. The design canvas passes a fixture from `.preview/fixtures`.
    That is the whole point of the generic — there is exactly one rendering
    path, and the canvas is just another caller of it.

    `loading` and `error` are explicit props, not values encoded in a magic
    state string, so an app drives them straight from its query state. */
export type PageProps<TData = unknown> = {
  /** Everything the page renders. Required: a page never invents content. */
  data: TData;
  /** First load, no data yet: render the skeleton silhouette. */
  loading?: boolean;
  /** The API failed. This string is shown to the user, so it must be real. */
  error?: string | null;
  /** Narrow viewport: the page collapses its grid and drops rails below the
      main column (CONVENTIONS §11). Components never breakpoint themselves. */
  mobile?: boolean;
};

export type PageComponent<TData = unknown> = ComponentType<PageProps<TData>>;

/** A page module: the component plus the finite set of states the canvas
    should prerender for it. Every page file exports one of these as `page`.

    The fixtures backing those states live in `.preview/fixtures`, keyed by
    page id and state id, so nothing demo-shaped ships in the library. */
export type PageModule<TData = unknown> = {
  id: string;
  title: string;
  route: string;
  component: PageComponent<TData>;
  states: PageStateDef[];
};

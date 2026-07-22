import type { ComponentType } from "react";

/** A named visual state of a page (default / loading / error / empty / edge). */
export type PageStateDef = { id: string; label: string };

/** Props every page component receives. `state` selects the variant to render;
    `mobile` switches the frame + layout to the narrow viewport. */
export type PageProps = { state?: string; mobile?: boolean };

export type PageComponent = ComponentType<PageProps>;

/** A page module: the component plus the finite set of states the canvas
    should prerender for it. Every page file exports one of these as `page`. */
export type PageModule = {
  id: string;
  title: string;
  route: string;
  component: PageComponent;
  states: PageStateDef[];
};

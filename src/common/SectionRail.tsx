import { Box, Chip, Stack } from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";

export interface RailSection {
  /** Matches the `id` of the `Section` this chip scrolls to. */
  id: string;
  label: string;
}

/**
 * How far below the top of the viewport an anchored section comes to rest, in pixels.
 *
 * The rail is the only thing pinned above it — the AppBar is `position: static` and has scrolled
 * away by the time an anchor is used — so this is the rail's own height plus enough that the
 * section's heading is not sitting against it.
 */
const SCROLL_MARGIN = 72;

/** Where the observer calls a section current: from just under the rail to the upper third. */
const ACTIVE_BAND = `-${SCROLL_MARGIN}px 0px -66% 0px`;

/**
 * A band a rail chip can scroll to.
 *
 * The `scrollMarginTop` is the whole reason this is a component rather than a bare `id`: without
 * it the browser lands the section's top edge at the top of the viewport, which is underneath the
 * sticky rail, and the first thing the reader was sent to see is the thing they cannot see.
 */
export const Section = ({ id, children }: { id: string; children: ReactNode }) => (
  <Box
    id={id}
    sx={{ scrollMarginTop: `${SCROLL_MARGIN}px` }}
  >
    {children}
  </Box>
);

/**
 * The page's own table of contents, pinned under the app bar.
 *
 * Chips scroll rather than link: the app is served under a `HashRouter`, so an `href="#timeline"`
 * would be read as a route and navigate away from the page it was meant to move within.
 */
export const SectionRail = (props: { sections: RailSection[] }) => {
  const active = useActiveSection(props.sections);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        // Under dialogs and the app bar, over the page it scrolls across.
        zIndex: (theme) => theme.zIndex.appBar - 1,
        // The page's own ground and not a card's: the rail sits on the page rather than in one,
        // and anything translucent would let the content scroll through it.
        backgroundColor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        paddingY: 1,
        overflowX: "auto",
        // A phone cannot show seven chips at once, and a scrollbar drawn across them would cost
        // more height than the chips themselves.
        scrollbarWidth: "none",
        "::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ width: "max-content" }}
      >
        {props.sections.map((section) => (
          <Chip
            key={section.id}
            label={section.label}
            size="small"
            color={section.id === active ? "primary" : "default"}
            variant={section.id === active ? "filled" : "outlined"}
            onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" })}
          />
        ))}
      </Stack>
    </Box>
  );
};

/**
 * Which section the reader is currently in, or `undefined` before the first observation.
 *
 * Keyed on the joined ids rather than on the array: a domain builds its section list inline, so
 * the array is a new value every render and depending on it would tear down and rebuild the
 * observer on each one.
 */
const useActiveSection = (sections: RailSection[]) => {
  const [active, setActive] = useState<string | undefined>(undefined);
  const ids = sections.map((section) => section.id).join(",");

  useEffect(() => {
    const elements = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((element) => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        // Nothing in the band happens between two sections and while a smooth scroll is in
        // flight. Holding the last answer is what stops the rail blanking as the reader passes
        // a boundary.
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: ACTIVE_BAND },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return active;
};

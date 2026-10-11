import { Box } from "@mui/material";

const KBD_SX = {
  fontSize: 10.5,
  paddingX: 0.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 0.5,
  lineHeight: 1.6,
  color: "text.secondary",
} as const;

/**
 * The shortcut sheet's size, where the keys are what the page is for rather than a hint beside a
 * field: a step up in type, and held to a square at least, so `j` and `⌘⇧K` read as keys alike.
 */
const LARGE_KBD_SX = { ...KBD_SX, fontSize: 12, minWidth: 22, paddingX: 0.75, textAlign: "center" } as const;

/** A key as the app writes one wherever it names a key: the box's hints, and the shortcut sheet. */
export const Kbd = (props: { children: string; large?: boolean }) => (
  <Box
    component="kbd"
    sx={props.large ? LARGE_KBD_SX : KBD_SX}
  >
    {props.children}
  </Box>
);

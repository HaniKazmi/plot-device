import { Box, Dialog, Stack, Typography } from "@mui/material";
import { usePhone } from "./common/breakpoints";
import { CURRENT_YEAR } from "./common/date";
import { Kbd } from "./common/Kbd";
import { modKey } from "./common/keyboard";
import { SheetBar } from "./common/SheetBar";
import { LABEL_SX } from "./common/typography";
import Tabs from "./tabs";

interface ShortcutRow {
  /** Every key that does it, each pressed alone: `j` `k` are next and previous, `s` `3` are both Shows. */
  keys: string[];
  text: string;
}

/**
 * Every key the app answers, grouped by what it acts on.
 *
 * Written out rather than gathered from the handlers: a handler holds neither the glyph a reader
 * looks for nor a sentence saying what the key is for, and the keys are answered in half a dozen
 * modules a gathering would have to reach into.
 */
const shortcutGroups = (mod: string, shift: string): { title: string; rows: ShortcutRow[] }[] => [
  {
    title: "Tabs",
    rows: [
      ...Tabs.map((tab, index) => ({ keys: [tab.shortcut, String(index + 1)], text: tab.name })),
      { keys: ["[", "]"], text: "The tab either side" },
    ],
  },
  {
    title: "This page",
    rows: [
      { keys: ["j", "k"], text: "Next or previous section" },
      { keys: ["n"], text: "Now" },
      { keys: ["l"], text: "Library" },
      { keys: ["c"], text: "Next measure" },
      { keys: ["y"], text: `All time, or ${CURRENT_YEAR} alone` },
      { keys: [",", "."], text: "A year back or on" },
      { keys: ["r"], text: "Read the sheets again" },
    ],
  },
  {
    title: "Search",
    rows: [
      { keys: ["/", `${mod}K`], text: "Find, across every library" },
      { keys: ["f"], text: "This page’s filters" },
      { keys: [`${mod}${shift}K`], text: "Switch between Find and This page" },
      { keys: [`${mod}⌫`], text: "Clear this page’s filters, in This page" },
    ],
  },
  {
    title: "Cards and layers",
    rows: [
      { keys: ["←", "→"], text: "The card before or after, in an opened card or drill-down" },
      { keys: ["esc"], text: "Close the layer, or leave a franchise’s page" },
      { keys: ["?"], text: "These shortcuts" },
    ],
  },
];

/** The key column, wide enough for the longest chord so every sentence starts on one edge. */
const ROW_SX = { display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "baseline", columnGap: 1.5 } as const;

/**
 * The sheet `?` opens: the app's keys, a group to a block, the blocks in two columns from `sm` up.
 *
 * Columns rather than a grid for the ledger's reason — the blocks are independent, and a grid
 * holds each to the tallest beside it. A fullscreen sheet below `sm` as every layer there is,
 * though a phone with a keyboard attached is the one reader it is for at that width.
 */
const ShortcutsSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const phone = usePhone();
  const mod = modKey();
  const groups = shortcutGroups(mod, mod === "⌘" ? "⇧" : "Shift+");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={phone}
      maxWidth="md"
      fullWidth
      aria-label="Keyboard shortcuts"
    >
      <SheetBar
        title="Keyboard shortcuts"
        onClose={onClose}
      />
      <Box sx={{ columnCount: { xs: 1, sm: 2 }, columnGap: 4, padding: 2 }}>
        {groups.map((group) => (
          <Stack
            key={group.title}
            spacing={0.75}
            sx={{ breakInside: "avoid", paddingBottom: 2 }}
          >
            <Typography
              variant="caption"
              component="h3"
              sx={{ ...LABEL_SX, color: "text.secondary" }}
            >
              {group.title}
            </Typography>
            {group.rows.map((row) => (
              <Box
                key={row.text}
                sx={ROW_SX}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "baseline" }}
                >
                  {row.keys.map((key) => (
                    <Kbd
                      key={key}
                      large
                    >
                      {key}
                    </Kbd>
                  ))}
                </Stack>
                <Typography variant="body2">{row.text}</Typography>
              </Box>
            ))}
          </Stack>
        ))}
      </Box>
    </Dialog>
  );
};

export default ShortcutsSheet;

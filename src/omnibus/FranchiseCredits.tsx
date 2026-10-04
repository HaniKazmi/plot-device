import { Brush } from "@mui/icons-material";
import { Card, CardContent, Link, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useState } from "react";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { SectionHeader } from "../common/SectionHeader";
import { CutButton, SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import type { CreditRole, OmniItem } from "../common/medium";
import { all, stated } from "../common/population";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";
import OmniCardMediaImage from "../app/CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "../app/cardData";
import { galleryStripOrder, galleryWorks, worksIn } from "../app/galleryData";
import { MediumDot } from "../app/MediaCounts";
import { mediumBand } from "../app/mediumBand";
import type { Medium } from "../utils/types";
import { CREDIT_ROLES, creditColumn, creditIndex, selfPublished, type Maker } from "./franchiseData";

/** How many names a column lists before its own cut. */
const MAKERS_SHOWN = 6;

/** A game's two credits, read one at a time so games take one column like every other medium. */
type GameRole = Extract<CreditRole, "developer" | "publisher">;

const GAME_ROLES: readonly SegmentOption<GameRole>[] = [
  { value: "developer", label: "Developer" },
  { value: "publisher", label: "Publisher" },
];

/** What a column counts the franchise's works of its medium in: whole works, a show and not its seasons. */
const WORK_UNITS: Record<Medium, [string, string]> = {
  book: ["book", "books"],
  movie: ["film", "films"],
  game: ["game", "games"],
  show: ["show", "shows"],
};

/**
 * Who made a franchise, a column per medium: who wrote the books, directed the films, made the
 * games and aired the shows.
 *
 * Each name carries what else the library holds by the same hands, and pressing that opens all of
 * it — the one place on the page that leads out of the franchise, Rian Johnson from Star Wars to
 * Knives Out. Games carry two credits and read them one at a time, so they take one column like
 * every other medium; where every game was published by the studio that made it the publisher
 * reading says nothing the developer reading has not, and the switch is left out for a note.
 */
const FranchiseCredits = ({ items, library }: { items: OmniItem[]; library: OmniItem[] }) => {
  const scheme = useScheme();
  const [gameRole, setGameRole] = useState<GameRole>("developer");
  const [expanded, setExpanded] = useState<CreditRole[]>([]);
  const [opened, setOpened] = useState<Maker | null>(null);
  const ownPublisher = selfPublished(items);
  // Built once for the library rather than per name, so a column looks each maker up.
  const index = creditIndex(library);

  // Built before the columns are drawn, so expanding one or pressing the games' switch reads them
  // rather than asking the library again.
  const columns = CREDIT_ROLES.filter(
    (column) =>
      items.some((item) => item.medium === column.medium) &&
      (column.medium !== "game" || column.role === (ownPublisher ? "developer" : gameRole)),
  ).map((column) => {
    const own = items.filter((item) => item.medium === column.medium);
    const works = worksIn(own);
    return {
      ...column,
      works,
      unit: WORK_UNITS[column.medium][works === 1 ? 0 : 1],
      makers: creditColumn(own, index, column.role),
    };
  });
  // Never wider than a third of the card, so a franchise of one medium does not stretch one
  // column across the page.
  const span = 12 / Math.max(columns.length, 3);

  return (
    <Card>
      <SectionHeader
        icon={<Brush />}
        title="Who made it"
      />
      <CardContent>
        <Grid
          container
          spacing={3}
        >
          {columns.map((column) => {
            const { makers } = column;
            const shown = expanded.includes(column.role) ? makers : makers.slice(0, MAKERS_SHOWN);
            return (
              <Grid
                key={column.medium}
                size={{ xs: 12, sm: 6, md: span }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ alignItems: "center", flexWrap: "wrap", paddingBottom: 1 }}
                >
                  <MediumDot
                    medium={column.medium}
                    scheme={scheme}
                  />
                  <Typography variant="subtitle2">{column.verb}</Typography>
                  <Typography
                    variant="body2"
                    sx={{ ...MUTED_FIGURE_SX, flexGrow: 1 }}
                  >
                    {`${column.works} ${column.unit} by ${stated(makers.length, column.noun[makers.length === 1 ? 0 : 1])}`}
                  </Typography>
                  {column.medium === "game" && !ownPublisher && (
                    <SegmentedControl
                      options={GAME_ROLES}
                      value={gameRole}
                      onChange={setGameRole}
                      ariaLabel="Games by"
                    />
                  )}
                </Stack>
                {shown.map((maker) => (
                  <MakerRow
                    key={maker.name}
                    maker={maker}
                    note={column.medium === "game" && ownPublisher ? "Self-published" : undefined}
                    onOpen={() => setOpened(maker)}
                  />
                ))}
                {makers.length > MAKERS_SHOWN && !expanded.includes(column.role) && (
                  <CutButton
                    label={all(makers.length)}
                    onClick={() => setExpanded([...expanded, column.role])}
                  />
                )}
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
      {opened && (
        <DrilldownDialog
          title={opened.name}
          onClose={() => setOpened(null)}
          content={galleryStripOrder(galleryWorks(opened.everything, "franchise", CURRENT_PLAINDATE), "recent")}
          cardKey={(item) => `maker-${item.key}`}
          labelComponent={workLabels}
          band={mediumBand(scheme)}
          rowSizing={MIXED_CARD_SIZING}
          MediaComponent={OmniCardMediaImage}
        />
      )}
    </Card>
  );
};

/**
 * One name: how many of the franchise's works it made and how long they took, which ones, and what
 * else the library holds by it — the last a press, opening the whole of their work.
 */
const MakerRow = ({ maker, note, onOpen }: { maker: Maker; note?: string; onOpen: () => void }) => {
  const elsewhere = maker.elsewhere.slice(0, 2);
  const more = maker.elsewhere.slice(2).reduce((sum, other) => sum + other.works, 0);
  const titles = [...new Set(maker.items.map((item) => item.name))].join(", ");

  return (
    <Stack
      spacing={0.25}
      sx={{ borderTop: 1, borderColor: "divider", paddingY: 1, minWidth: 0 }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "baseline" }}
      >
        <Typography
          variant="subtitle2"
          noWrap
          sx={{ flexGrow: 1 }}
        >
          {maker.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ ...MUTED_FIGURE_SX, flexShrink: 0 }}
        >
          {`${stated(maker.works, maker.works === 1 ? "work" : "works")} · ${stated(Math.floor(maker.hours), "hours")}`}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        noWrap
        sx={{ color: "text.secondary" }}
      >
        {note ? `${note} · ${titles}` : titles}
      </Typography>
      {elsewhere.length > 0 ? (
        <Link
          component="button"
          variant="body2"
          underline="hover"
          onClick={onOpen}
          sx={{ alignSelf: "flex-start", textAlign: "left" }}
        >
          {`Elsewhere: ${elsewhere.map((other) => `${other.works} ${other.franchise}`).join(", ")}${more ? ` and ${more} more` : ""} ›`}
        </Link>
      ) : (
        <Typography
          variant="body2"
          sx={{ color: "text.secondary" }}
        >
          Nothing else in the library
        </Typography>
      )}
    </Stack>
  );
};

export default FranchiseCredits;

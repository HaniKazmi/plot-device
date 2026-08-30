import { AutoGraph, Pause, PlayArrow, ShowChart, TaskAlt, Timer, Update } from "@mui/icons-material";
import { Season, Show, Status } from "./types";
import { StatCard, StatList, StatsListProps, TotalsBand, VitalsCard } from "../common/Stats";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";
import { CURRENT_YEAR } from "../common/date";
import { Section, StatBand } from "../common/SectionRail";
import { SHOW_SECTIONS } from "./sections";
import {
  allTimeTotals,
  perShowAverages,
  recentlyComplete,
  seasonsInYear,
  statsCardLabelCurrentlyPlaying,
  statsCardLabelRecentlyComplete,
  yearlyAverages,
} from "./statsData";

const Stats = ({ data, watching }: { data: Show[]; watching: Season[] }) => {
  return (
    <Stack spacing={2}>
      {/* What is in flight, and the page's "now" — a strip rather than one item raised above the
          rest, because several shows are always on the go and picking one of them to lead with
          means inventing a tie-break the data does not have. Nothing being watched and the
          section is not rendered at all. `watching` is computed by `Graphs`, which decides on
          the same value whether the rail offers a chip pointing here. */}
      {watching.length > 0 && (
        <Section id={SHOW_SECTIONS.now}>
          <StatBand>
            <CurrentlyWatching watching={watching} />
          </StatBand>
        </Section>
      )}
      <Section id={SHOW_SECTIONS.vitals}>
        <StatBand>
          <StatSummary
            icon={<Timer />}
            title="All Time"
            stats={allTimeTotals(data)}
          />
          <StatSummary
            icon={<Update />}
            title={`In ${CURRENT_YEAR}`}
            stats={seasonsInYear(data, CURRENT_YEAR)}
          />
          <StatSummary
            icon={<ShowChart />}
            title="Yearly Average"
            stats={yearlyAverages(data)}
          />
          <StatSummary
            icon={<AutoGraph />}
            title="Show Average"
            stats={perShowAverages(data)}
          />
          <Vitals data={data} />
        </StatBand>
      </Section>
      <Section id={SHOW_SECTIONS.explore}>
        <StatBand>
          <RecentlyComplete data={data} />
        </StatBand>
      </Section>
    </Stack>
  );
};

/** The one band saying what the library is made of, dense enough to scan past. */
const Vitals = ({ data }: { data: Show[] }) => {
  const statusList: Status[] = ["Watching", "Up To Date", "Ended", "Cancelled", "Abandoned"];

  return (
    <VitalsCard>
      <TotalsBand
        title={"Status"}
        icon={<TaskAlt />}
        data={data}
        groupKey="status"
        group={statusList}
        groupToColour={(ele: Status) => statusToColour({ status: ele })}
        measureLabel="Shows"
      />
    </VitalsCard>
  );
};

/** Each `statsData` total is already keyed by the label it renders under, in display order. */
const StatSummary = ({ icon, title, stats }: { icon: ReactNode; title: string; stats: Record<string, number> }) => (
  <StatCard
    icon={icon}
    title={title}
    content={Object.entries(stats).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])}
  />
);

const RecentlyComplete = ({ data }: { data: Show[] }) => {
  const recent = recentlyComplete(data);
  return (
    <ShowStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      chipComponent={({ show }) => ({ label: show.status, colour: statusToColour(show) })}
      labelComponent={statsCardLabelRecentlyComplete}
    />
  );
};

const CurrentlyWatching = ({ watching }: { watching: Season[] }) => (
  <ShowStatList
    icon={<PlayArrow />}
    title="Currently Watching"
    content={watching}
    chipComponent={({ e }) => ({ label: `E ${e}` })}
    wrap={false}
    labelComponent={statsCardLabelCurrentlyPlaying}
  />
);

const ShowStatList = (
  props: Omit<
    StatsListProps<Season>,
    "MediaComponent" | "nameComponent" | "width" | "pictureWidth" | "dialogPictureWidth"
  >,
) => (
  <StatList
    MediaComponent={ShowCardMediaImage}
    nameComponent={(entry) => entry.show.name + entry.s}
    width={[12, 12, 12]}
    pictureWidth={[6, 4, 2]}
    dialogPictureWidth={[6, 4, 2]}
    {...props}
  />
);

export default Stats;

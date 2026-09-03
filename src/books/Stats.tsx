import {
  AutoStories,
  Bookmarks,
  Category,
  Grade,
  History,
  MenuBook,
  Person,
  ShowChart,
  Stars,
  TaskAlt,
  Whatshot,
} from "@mui/icons-material";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";
import {
  StatCard,
  StatList,
  StatSummary,
  TotalsBand,
  VitalsCard,
  YearVitalsPair,
  type GridListLayout,
  type StatListBaseProps,
} from "../common/Stats";
import { TopCategoryBand } from "../common/TopList";
import { GroupedStatList } from "../common/GroupedStatList";
import { Hero } from "../common/Hero";
import { Section, StatBand } from "../common/SectionRail";
import { CURRENT_PLAINDATE, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { useSelectBox } from "../common/SelectBoxHook";
import { format } from "../utils/mathUtils";
import { groupsOnce, type DrilldownGroup } from "../common/statsData";
import { genreToColour, scoreBand, scoreBandToColour, scoreBands, type Scheme } from "../utils/types";
import { bookHeroRows, bookSubtitle } from "./cardData";
import BookCardMediaImage, { BookFranchiseStrip } from "./CardMediaImage";
import { BOOK_SECTIONS } from "./sections";
import type { FilterDispatch } from "./filterUtils";
import { FORMATS, formatToColour, groupToColour, type Book, type Measure } from "./types";
import {
  bookHeroStats,
  bookKey,
  bookTopOptions,
  bookTotals,
  booksInYear,
  groupBooksBy,
  measureOf,
  perBookAverages,
  statsCardLabelFinished,
  statsCardLabelPages,
  yearlyAverages,
  type BookTopOption,
} from "./statsData";
import "../utils/arrayUtils";
import { useScheme } from "../common/useScheme";

const Stats = ({
  data,
  reading,
  earliestYear,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: Book[];
  /** Every book in progress, most recently started first. Computed by `Graphs`, which also
      decides on it whether the rail offers a chip pointing at the hero below. */
  reading: Book[];
  /** The library's own first year, read from the unfiltered data so the select's floor does not
      rise with the filters. */
  earliestYear: YearNumber;
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  // One grouping per category for the page: the vitals band, the Top card and Most Read all ask
  // for genre or author, and each grouping is a pass over the library.
  const groupsBy = groupsOnce((option: BookTopOption) => groupBooksBy(data, option, measure));

  return (
    <Stack spacing={2}>
      {/* No book in hand and there is no "now" to lead with. */}
      {reading.length > 0 && (
        <Section id={BOOK_SECTIONS.now}>
          <BookHero book={reading[0]} />
        </Section>
      )}
      <Section id={BOOK_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
            down the page, never up — so the cards come before the bands they redraw. */}
          <YearVitalsPair
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            earliestYear={earliestYear}
            allTime={bookTotals(data)}
            inYear={booksInYear(data, yearTo)}
          />
          <StatSummary
            icon={<ShowChart />}
            title="Yearly Average"
            stats={yearlyAverages(data)}
          />
          <BookAverage data={data} />
          <Vitals
            data={data}
            measure={measure}
            genreGroups={groupsBy("genre")}
          />
        </StatBand>
      </Section>
      <Section id={BOOK_SECTIONS.top}>
        <StatBand>
          <TopCategories
            groupsBy={groupsBy}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={BOOK_SECTIONS.explore}>
        <StatBand>
          <RecentlyFinished data={data} />
          <MostRead
            data={data}
            groupsBy={groupsBy}
            measure={measure}
          />
        </StatBand>
      </Section>
    </Stack>
  );
};

/**
 * The book in hand, promoted. Its figures are its own — hours so far, days in, pages, its place in
 * its series — and the library's totals stay in the cards below, which are their single home.
 */
const BookHero = ({ book }: { book: Book }) => {
  const scheme = useScheme();

  return (
    <Hero
      item={book}
      MediaComponent={BookCardMediaImage}
      kicker={`Reading since ${formatDate(book.startDate)}`}
      title={book.name}
      subtitle={bookSubtitle(book, scheme)}
      stats={bookHeroStats(book, CURRENT_PLAINDATE, "hero")}
      strip={
        <BookFranchiseStrip
          book={book}
          mode="order"
        />
      }
      rows={bookHeroRows(book, scheme)}
    />
  );
};

/**
 * Genre, score and format, as one band each. Genre first because it is the vocabulary every row
 * answers — a score is optional and a library read on one device is one format — and its segments
 * run biggest first, since the vocabulary is open-ended and has no order of its own.
 */
const Vitals = ({
  data,
  measure,
  genreGroups,
}: {
  data: Book[];
  measure: Measure;
  /** The genre grouping under the current measure, which orders the band's segments. */
  genreGroups: DrilldownGroup<Book>[];
}) => {
  const scheme = useScheme();

  const measureFunc = (books: Book[]) => measureOf(books, measure);

  return (
    <VitalsCard>
      <TotalsBand
        title="Genre"
        icon={<Category />}
        data={data}
        measureFunc={measureFunc}
        group={genreGroups.map((group) => group.name)}
        groupOf={(book) => book.genre}
        groupToColour={(ele) => genreToColour(ele, scheme)}
        measureLabel={measure}
      />
      <TotalsBand
        title="Score"
        icon={<Grade />}
        data={data}
        measureFunc={measureFunc}
        group={[...scoreBands]}
        groupOf={(book) => scoreBand(book.score)}
        groupToColour={(ele) => scoreBandToColour(ele, scheme)}
        measureLabel={measure}
      />
      <TotalsBand
        title="Format"
        icon={<MenuBook />}
        data={data}
        measureFunc={measureFunc}
        group={[...FORMATS]}
        groupOf={(book) => book.format}
        groupToColour={(ele) => formatToColour(ele, scheme)}
        measureLabel={measure}
      />
    </VitalsCard>
  );
};

const BookAverage = ({ data }: { data: Book[] }) => {
  const { pages, hours, days } = perBookAverages(data);
  return (
    <StatCard
      icon={<AutoStories />}
      title="Per Book"
      content={[
        ["Pages", pages],
        ["Hours", hours],
        ["Days", days],
      ]}
    />
  );
};

/** The groupings of the page's data under its measure, one per option asked for. */
type GroupsBy = (option: BookTopOption) => DrilldownGroup<Book>[];

const TopCategories = ({ groupsBy, measure }: { groupsBy: GroupsBy; measure: Measure }) => {
  const scheme = useScheme();

  return (
    <TopCategoryBand
      defaults={["genre", "author", "franchise"]}
      options={bookTopOptions}
      icons={optionIcons}
      groups={groupsBy}
      colourOf={(option, top: Book) => groupToColour(option, top, scheme)}
      measureLabel={measure}
    />
  );
};

const optionIcons: Record<BookTopOption, ReactNode> = {
  genre: <Category />,
  author: <Person />,
  franchise: <Stars />,
  series: <Bookmarks />,
  format: <MenuBook />,
  score: <Grade />,
  status: <TaskAlt />,
  decade: <History />,
};

/**
 * Only what has closed, newest first: the book in hand is the hero's, and a strip titled
 * "finished" listing it says something false. The filter also leaves every entry a date to sort
 * by, where `sortByKey` would otherwise head the list with the undated one.
 */
const RecentlyFinished = ({ data }: { data: Book[] }) => (
  <BookStatList
    icon={<History />}
    title="Recently Finished"
    content={data.filter((book) => book.endDate).sortByKey("endDate")}
    labelComponent={statsCardLabelFinished}
  />
);

const bookMostReadOptions = ["name", ...bookTopOptions] as const;

const MostRead = ({ data, groupsBy, measure }: { data: Book[]; groupsBy: GroupsBy; measure: Measure }) => {
  const [option, controls] = useSelectBox(bookMostReadOptions, "author");

  if (option === "name") {
    return (
      <MostReadBooks
        data={data}
        controls={controls}
      />
    );
  }
  return (
    <MostReadCategory
      groupsBy={groupsBy}
      measure={measure}
      controls={controls}
      category={option}
    />
  );
};

const MostReadBooks = ({ data, controls }: { data: Book[]; controls: ReactNode }) => {
  const most = data.filter((book) => book.hours).sortByKey("hours");
  return (
    <BookStatList
      controls={controls}
      icon={<Whatshot />}
      title="Most Read"
      content={most}
      labelComponent={statsCardLabelPages}
    />
  );
};

const MostReadCategory = ({
  groupsBy,
  measure,
  category,
  controls,
}: {
  groupsBy: GroupsBy;
  measure: Measure;
  category: BookTopOption;
  controls: ReactNode;
}) => {
  const scheme = useScheme();

  return (
    <GroupedStatList
      icon={<Whatshot />}
      controls={controls}
      title="Most Read"
      option={category}
      groups={groupsBy(category)}
      // The name and the figure stacked rather than side by side — under a cover there is no
      // width for both on one line.
      labelComponent={(group) => [[group.name], [`${format(group.count)} ${measure}`]]}
      colourOf={(top) => groupToColour(category, top, scheme)}
      MediaComponent={BookCardMediaImage}
      // Series order where the sheet numbers one, reading order where it does not: a drill-down
      // into a series is read the way the series is.
      dialogSort={(books) => books.toSorted(bySeriesThenStart)}
      nameOf={bookKey}
      dialogLabelComponent={statsCardLabelFinished}
      dialogChipComponent={(book) => bookScoreChip(book, scheme)}
      {...bookStatListSharedProps}
    />
  );
};

/**
 * Each series together and in its own order, then everything by start date: a group that holds
 * two numbered series — an author's, a franchise's — reads one series through before the next
 * rather than interleaving their firsts, seconds and thirds. Standalones sort after the series,
 * since the empty series name sorts before every real one only under an ascending compare, and a
 * numbered entry before an unnumbered one because `Infinity` stands in for a number.
 */
const bySeriesThenStart = (a: Book, b: Book) => {
  if (a.series !== b.series) return a.series === "" ? 1 : b.series === "" ? -1 : a.series.localeCompare(b.series);
  const byNumber = (a.seriesNumber ?? Infinity) - (b.seriesNumber ?? Infinity);
  if (byNumber) return byNumber;
  return a.startDate === b.startDate ? 0 : a.startDate.lte(b.startDate) ? -1 : 1;
};

/** The corner badge: the book's score, wearing its band's fill. Unscored books carry none. */
const bookScoreChip = (book: Book, scheme: Scheme) =>
  book.score !== undefined
    ? { label: String(book.score), colour: scoreBandToColour(scoreBand(book.score), scheme) }
    : undefined;

const bookStatListSharedProps: Pick<StatListBaseProps<Book>, "shape" | "divider" | "width"> & GridListLayout = {
  // Covers, not banners — the cards keep the shape the library grid shows them at.
  shape: "cover",
  divider: true,
  // Two cards to the band, each half the row at `md`, and four covers to a row inside it — half
  // the page holds four covers at the width a quarter of it held two.
  width: [12, 12, 6],
  pictureWidth: [6, 4, 3],
  dialogPictureWidth: [6, 3, 2],
};

const BookStatList = (
  props: Omit<
    StatListBaseProps<Book>,
    "MediaComponent" | "chipComponent" | "nameComponent" | keyof typeof bookStatListSharedProps
  >,
) => {
  const scheme = useScheme();

  return (
    <StatList
      chipComponent={(book) => bookScoreChip(book, scheme)}
      MediaComponent={BookCardMediaImage}
      nameComponent={bookKey}
      {...bookStatListSharedProps}
      {...props}
    />
  );
};

export default Stats;

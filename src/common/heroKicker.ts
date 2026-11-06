import { formatDate, type YearMonthDay } from "./date";

/**
 * What a page's hero says its item is to the reader: something being done since the day it began,
 * or something done on the day it ended. Each tab names only its verb and its day.
 */
export type HeroActivity = { doing: string; since: YearMonthDay } | { did: string; on: YearMonthDay };

/**
 * The line over a hero's title, in one construction on every tab — "Playing since 23 Oct 2026",
 * "Watched 17 Oct 2026" — so four heroes read alike however their tabs elect them. Worded here
 * rather than at each tab, where each sentence is free to take a shape of its own — an episode on
 * the end, a "last" in front — and four heroes stop reading as one.
 */
export const heroKicker = (activity: HeroActivity) =>
  "doing" in activity
    ? `${activity.doing} since ${formatDate(activity.since)}`
    : `${activity.did} ${formatDate(activity.on)}`;

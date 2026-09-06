/** Sends one request for several ranges of one spreadsheet, answering a grid per range in order. */
type SendBatch = (spreadsheetId: string, ranges: string[]) => Promise<(string[][] | undefined)[]>;

/**
 * A reader that collects every range asked for in one tick and fetches them together.
 *
 * The four ranges are four tabs of one spreadsheet, and `LibraryProvider` mounts four `useData`
 * hooks whose effects all run in a single commit — so four separate reads are four requests, four
 * auth round trips and four quota units for what one `batchGet` answers. The gain is quota and not
 * latency: the four were already concurrent against one host.
 *
 * The batch forms in a microtask. That is long enough for a commit's effects to have queued every
 * range they are going to, and short enough that nothing waits on a timer — a caller that arrives
 * alone still leaves in the same tick it asked in. A range asked for later, by a tab mounted after
 * the others or by a refresh, simply forms the next batch.
 *
 * The timing is inferred rather than declared, which is worth stating because it fails soft: if
 * effects ever stop flushing together the batch splits and the reads are slower, never wrong.
 *
 * Keyed by spreadsheet, because a batch reads ranges of one file: a medium whose sheet lives in
 * another document batches with itself rather than not at all.
 */
export const rangeBatcher = (send: SendBatch) => {
  const forming = new Map<string, { ranges: string[]; grids: Promise<(string[][] | undefined)[]> }>();

  return (spreadsheetId: string, range: string): Promise<string[][]> => {
    let batch = forming.get(spreadsheetId);
    if (!batch) {
      // The array the request is sent with rather than a copy of it, so every range pushed between
      // here and the microtask is in the batch. Cleared before the send and not after, so the next
      // ask opens the next batch rather than joining one already on the wire.
      const ranges: string[] = [];
      batch = {
        ranges,
        grids: Promise.resolve().then(() => {
          forming.delete(spreadsheetId);
          return send(spreadsheetId, ranges);
        }),
      };
      forming.set(spreadsheetId, batch);
    }

    // The response holds one entry per requested range, in the order they were asked for, so a
    // caller's own grid is the one at the index its range landed at.
    const index = batch.ranges.push(range) - 1;
    return batch.grids.then((grids) => grids[index] ?? []);
  };
};

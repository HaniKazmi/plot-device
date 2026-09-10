/**
 * An hours figure as a chart prints it: floored, as every hours total on a tab is, except under an
 * hour, where a floor erases a figure the chart still draws — a 48-minute season is a wedge stating
 * 0. One decimal there, so the words and the geometry agree.
 */
export const printedHours = (hours: number) => (hours < 1 ? Math.round(hours * 10) / 10 : Math.floor(hours));

export const format = new Intl.NumberFormat().format;

/**
 * Turns counts into percentages of `total`, flooring each at 0.5% so tiny slices stay visible,
 * then absorbs the resulting rounding shortfall into the first entry so the bar always fills.
 * `total` is a parameter because callers scope it differently — over all data, or over just
 * the rows being displayed.
 */
export const assignPercents = <T extends { count: number }>(items: T[], total: number) => {
  let percentLeft = 100;
  const withPercent = items.map((item) => {
    const percent = Math.max((item.count / total) * 100, 0.5);
    percentLeft -= percent;
    return { ...item, percent };
  });

  if (withPercent.length > 0) withPercent[0].percent += percentLeft;
  return withPercent;
};

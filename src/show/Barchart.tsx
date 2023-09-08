import { CardHeader, FormControlLabel, FormGroup, Stack, Switch } from "@mui/material";
import { useState } from "react";
import { SelectBox } from "../vg/SelectionComponents";
import { Measure, Season, Show, ShowStringKeys } from "./types";
import Barchart from "../common/Barchart";
import { Grouped } from "../vg/Barchart";

const options: Record<ShowStringKeys | "none", boolean> = {
  name: false,
  status: true,
  none: false,
};

const ShowBarchart = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [group, setGroup] = useState<ShowStringKeys | "none">("none");
  const [cumulative, setCumulative] = useState(false);
  const [stack, setStack] = useState(true);

  const seasonArray = data.flatMap((show) => show.s);
  const grouped = groupDate(seasonArray, group, measure, cumulative);

  return (
    <Barchart grouped={grouped} cumulative={cumulative} stack={stack}>
      <CardHeader
        title={measure === "Episodes" ? "Episodes Watched" : "Hours Watched"}
        action={
          <FormGroup>
            <SelectBox
              options={Object.keys(options) as (ShowStringKeys | "none")[]}
              value={group}
              setValue={setGroup}
            />
            <Stack direction={"row"}>
              <FormControlLabel
                label="Cumulative"
                control={<Switch checked={cumulative} onChange={(_, checked) => setCumulative(checked)} />}
              />
              <FormControlLabel
                label="Stack"
                control={<Switch checked={stack} onChange={(_, checked) => setStack(checked)} disabled={cumulative} />}
              />
            </Stack>
          </FormGroup>
        }
      />
    </Barchart>
  );
};

const groupDate = (data: Season[], group: ShowStringKeys | "none", measure: Measure, cumulative: boolean): Grouped => {
  const grouped = data.reduce((tree, season) => {
    const { show } = season;
    const groupVal = group === "none" ? "" : show[group];
    const year = cumulative
      ? season.startDate?.toISOString().substring(0, 7)
      : season.startDate?.getFullYear().toString();
    if (!year || !season.minutes) return tree;

    tree[groupVal] ??= { color: "", data: {} };
    tree[groupVal].data[year] = (tree[groupVal].data[year] || 0) + (measure === "Episodes" ? season.e : season.minutes);
    return tree;
  }, {} as Grouped);

  if (measure === "Hours") {
    Object.values(grouped).forEach(({ data: record }) =>
      Object.entries(record).forEach(([key, value]) => (record[key] = Math.floor(value / 60))),
    );
  }

  return grouped;
};

export default ShowBarchart;

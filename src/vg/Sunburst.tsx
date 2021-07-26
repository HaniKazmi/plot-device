import { VideoGame } from "./Types";
import Plot from "react-plotly.js";
import { useState } from "react";

const Charts = ({ data }: { data: VideoGame[] }) => {
  return (
    <div>
      <Sunburst data={data} />
    </div>
  );
};

const Sunburst = ({ data }: { data: VideoGame[] }) => {
  const [group1, setGroup1] = useState<keyof VideoGame>("franchise");
  const [group2, setGroup2] = useState<keyof VideoGame>("platform");
  const [group3, setGroup3] = useState<keyof VideoGame>("company");

  const [countProp, setCountProp] = useState<"Hours" | "Count">("Count");

  const keyToVal = (game: VideoGame, key: keyof VideoGame): string => {
    const val = game[key];
    if (key === "startDate" && val) {
      return (val as Date).getFullYear().toString();
    } else {
      return val as string;
    }
  };

  const grouped = data.reduce((prev, curr) => {
    const group1Val = keyToVal(curr, group1);
    const group2Val = keyToVal(curr, group2);
    const group3Val = keyToVal(curr, group3);
    const gameVal = curr.game;

    if (group1Val === undefined || group2Val === undefined || group3Val === undefined) {
      return prev;
    }

    if (countProp === "Hours" && curr.hours === undefined) {
      return prev;
    }

    prev[group3Val] = prev[group3Val] || {};
    prev[group3Val][group2Val] = prev[group3Val][group2Val] || {};
    prev[group3Val][group2Val][group1Val] = prev[group3Val][group2Val][group1Val] || {};
    prev[group3Val][group2Val][group1Val][gameVal] = prev[group3Val][group2Val][group1Val][gameVal] || 0;

    prev[group3Val][group2Val][group1Val][gameVal] += countProp === "Hours" ? parseInt(curr.hours!) : 1;
    return prev;
  }, {} as Record<string, Record<string, Record<string, Record<string, number>>>>);

  const ids: string[] = [];
  const labels: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];

  Object.entries(grouped)
    .sort(([val], [val2]) => val.localeCompare(val2))
    .forEach(([company, platforms]) => {
      let companyTotal = 0;
      Object.entries(platforms)
        .sort(([val], [val2]) => val.localeCompare(val2))
        .forEach(([platform, formats]) => {
          let platformTotal = 0;
          Object.entries(formats)
            .sort(([val], [val2]) => val.localeCompare(val2))
            .forEach(([format, games]) => {
              let gameTotal = 0;
              Object.entries(games)
                .sort(([val], [val2]) => val.localeCompare(val2))
                .forEach(([game, count]) => {
                  labels.push(game);
                  parents.push(`${company}-${platform}-${format}`);
                  values.push(count);
                  ids.push(`${company}-${platform}-${format}-${game}`);
                  gameTotal += count;
                });
              labels.push(format);
              parents.push(`${company}-${platform}`);
              values.push(gameTotal);
              ids.push(`${company}-${platform}-${format}`);
              platformTotal += gameTotal;
            });
          labels.push(platform);
          parents.push(company);
          values.push(platformTotal);
          ids.push(`${company}-${platform}`);
          companyTotal += platformTotal;
        });
      labels.push(company);
      parents.push("");
      values.push(companyTotal);
      ids.push(`${company}`);
    });

  const options: (keyof VideoGame)[] = [
    "company",
    "format",
    "franchise",
    "game",
    "platform",
    "publisher",
    "rating",
    "status",
    "startDate",
  ];

  return (
    <div>
      <select value={group1} onChange={(event) => setGroup1(event.target.value as keyof VideoGame)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <select value={group2} onChange={(event) => setGroup2(event.target.value as keyof VideoGame)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <select value={group3} onChange={(event) => setGroup3(event.target.value as keyof VideoGame)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <div>
        <input
          type="radio"
          value="Count"
          name="count"
          defaultChecked={true}
          onChange={(event) => setCountProp(event.currentTarget.value as any)}
        />{" "}
        Count
        <input
          type="radio"
          value="Hours"
          name="count"
          onChange={(event) => setCountProp(event.currentTarget.value as any)}
        />{" "}
        Hours
      </div>
      <Plot
        style={{ width: "100vw", height: "95vh" }}
        data={[
          {
            labels,
            parents,
            values,
            ids,
            type: "sunburst",
            branchvalues: "total",
            sort: false,
            maxdepth: 3,
          } as any,
        ]}
        config={{ displayModeBar: false, responsive: true }}
        layout={{ margin: { l: 0, r: 0, b: 0, t: 0 } } as any}
      />
    </div>
  );
};

export default Charts;

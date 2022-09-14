import { Card, CardContent, Container, createTheme, Stack, ThemeProvider } from "@mui/material";
import { useState, useEffect, ReactNode } from "react";
import Goth from 'gothic'
import Chart from "react-google-charts";
import NavBar from "../NavBar";
import Barchart from "./Barchart";
import Filter from "./Filter";
import Stats from "./Stats";
import PieChart from "./Sunburst";
import Timeline from "./Timeline";
import { VideoGame, Status, Format, Platform, Company, Predicate, Measure } from "./Types";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID!;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY!;
const DISCOVERY_DOCS = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const gothWatch = (setAuth: (b: boolean) => void) => {
  return (event: string) => {
    console.log(event)
    switch (event) {
      case 'signin':
        const gapiToken = gapi.auth.getToken()
        const expiry = Date.now() + (parseInt(gapiToken.expires_in) * 1000)
        sessionStorage.setItem("gapi-token", JSON.stringify({ token: gapiToken, expiry: expiry }))
        setAuth(true)
        break;
      case 'revoke':
      case 'signout':
      case 'onetap_suppressed':
        setAuth(false)
        break;
      case 'loaded':
        const token = JSON.parse(sessionStorage.getItem("gapi-token")!)
        if (token && token.expiry > Date.now()) {
          console.log("Reusing Token")
          gapi.auth.setToken(token.token)
          setAuth(true)
        } else if (Goth.recognize()) {
          console.log("One Tap")
          Goth.onetap();
        } else {
          setAuth(false)
        }
        break;
      default:
    }
  }
}

const GoogleAuth = ({ children }: { children?: ReactNode}) => {
  const [auth, setAuth] = useState<boolean>();

  useEffect(() => {
    Goth.observe(gothWatch(setAuth));
    Goth.load(CLIENT_ID, API_KEY, SCOPE, DISCOVERY_DOCS)
  }, [])

  return (
    <>
      <NavBar auth={auth} />
      {auth && children}
    </>
  );
};

const VideoSheet = () => (
  <GoogleAuth>
    <Container>
      <GamesGraphs />
      <ShowsGraph />
    </Container>
  </GoogleAuth>
);

const ShowsGraph = () => {
  const [data, setData] = useState<Record<string, string>[]>();
  useEffect(() => getShowData(setData), []);

  if (!data) {
    console.log("no data");
    return <div />;
  }

  const showData = data
    .filter(row => row["Show"] !== '')
    .map(row => {
      return {
        show: row["Show"],
        status: row["Status"] as Platform,
        startDate: row["Start"] ? new Date(row["Start"]) : undefined,
        endDate: row["End"] ? new Date(row["End"]) : new Date(),
        length: row["Length"]
      };
    });

  console.log(showData);

  const timelineData: any[] = [
    [
      { type: "string", id: "*" },
      { type: "string", id: "Show" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" }
    ]
  ];

  const gameData = showData
    // .filter(({ startDate }) => startDate?.getFullYear()! > 2014)
    .map((row) => ["*", row.show, row.startDate, row.endDate]);


  return (
    <Card variant="outlined" >
      <CardContent>
        TV Shows
      </CardContent>
      <CardContent>
        <div style={{ overflow: "auto", overflowY: "clip" }}>
          <Chart style={{ width: "400vw", height: "100vh" }} chartType="Timeline" data={timelineData.concat(gameData)} />
        </div>
      </CardContent>
    </Card>
  );
};

const date_diff_in_days = (dt1?: Date, dt2?: Date) => {
  if (!dt1 || !dt2) return
  return Math.floor(
    (Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) -
      Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate())) /
    (1000 * 60 * 60 * 24) + 1
  )
};

const GamesGraphs = () => {
  const [data, setData] = useState<Record<string, string>[]>();
  const [filterFunc, setFilterFunc] = useState<Predicate<VideoGame>>(() => () => true);
  const [measure, setMeasure] = useState<Measure>("Count");

  useEffect(() => getVgData(setData), []);

  if (!data) {
    console.log("no data");
    return <div />;
  }

  const vgData: VideoGame[] = data.map(row => {
    const startDate = row["Start Date"] ? new Date(row["Start Date"]) : undefined
    const endDate = row["End Date"] ? new Date(row["End Date"]) : undefined;
    endDate && row["End Date"].length < 5 && endDate.setFullYear(endDate.getFullYear() + 1);
    return {
      game: row["Game"],
      platform: row["Platform"] as Platform,
      company: row["Platform"].split(" ")[0]! as Company,
      franchise: row["Franchise"],
      genre: row["Genre"].split("\n"),
      theme: row["Theme"].split("\n"),
      format: row["Format"] as Format,
      publisher: row["Publisher"],
      rating: row["Rating"],
      status: row["Status"] as Status,
      exactDate: !!row["Start Date"] && row["Start Date"].length > 5,
      startDate: startDate,
      endDate: endDate || new Date(),
      hours: row["Hours"],
      numDays: date_diff_in_days(startDate, endDate)
    };
  })
    .filter(filterFunc);

  const theme = createTheme({
    components: {
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&:hover': {
              boxShadow: theme.shadows[4]
            }
          }),
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2}>
        <Stats data={vgData} />
        <Timeline data={vgData} />
        <PieChart data={vgData} measure={measure} />
        <Barchart data={vgData} measure={measure} />
        <Filter setFilterFunc={setFilterFunc} measure={measure} setMeasure={setMeasure} />
      </Stack>
    </ThemeProvider>
  );
};

const arrayToJson = (data: string[][]) => {
  const [header, ...rows] = data;
  return rows.map(row => {
    const json: Record<string, string> = {};
    row.forEach((val, index) => json[header[index]] = val);
    return json;
  });
};

const getVgData = (setData: (b: Record<string, string>[]) => void) => {
  console.log("fetching data");
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
      range: "Games List!A:Z"
    })
    .then(response => response.result.values!)
    .then(arrayToJson)
    .then(setData);
};

const getShowData = (setData: (b: Record<string, string>[]) => void) => {
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1M3om2DPLfRO5dKcUfYOIcSNoLThzMLp1iZLQX6qR3pY",
      range: "Sheet1!A:H"
    })
    .then(response => response.result.values!)
    .then(arrayToJson)
    .then(setData);
};

export default VideoSheet;

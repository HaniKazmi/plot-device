import { useState, useEffect, FunctionComponent, Fragment } from "react";
import Piechart from "./Sunburst";
import Timeline from "./Timeline";
import { VideoGame, Status, Format } from "./Types";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

const GoogleAuth: FunctionComponent = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>();

  useEffect(() => loadGapi(setIsSignedIn), []);

  const renderAuthButton = () => {
    if (isSignedIn === undefined) {
      return <div>I don't know if we are signed in</div>;
    } else if (isSignedIn) {
      return (
        <span>
          I am signed in
          <button id="sign-in-or-out-button" style={{ marginLeft: 25 }} onClick={handleAuthClick}>
            Sign Out
          </button>
        </span>
      );
    } else {
      return (
        <span>
          I am not signed in
          <button id="sign-in-or-out-button" style={{ marginLeft: 25 }} onClick={handleAuthClick}>
            Sign In
          </button>
        </span>
      );
    }
  };

  return (
    <div>
      {renderAuthButton()}
      {isSignedIn && children}
    </div>
  );
};

const loadGapi = (setIsSignedIn: (b: boolean) => void) => {
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/client.js";

  script.onload = () => {
    console.log("loading");
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          clientId: CLIENT_ID,
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
          scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        })
        .then(() => {
          const authInstance = gapi.auth2.getAuthInstance();
          authInstance.isSignedIn.listen(setIsSignedIn);

          setIsSignedIn(authInstance.isSignedIn.get());
        });
    });
  };

  document.body.appendChild(script);
};

const handleAuthClick = () => {
  if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
    // User is authorized and has clicked "Sign out" button.
    gapi.auth2.getAuthInstance().signOut();
  } else {
    // User is not signed in. Start Google auth flow.
    gapi.auth2.getAuthInstance().signIn();
  }
};

const VideoSheet = () => {
  return (
    <GoogleAuth>
      <GamesTimeline />
    </GoogleAuth>
  );
};

const GamesTimeline = () => {
  const [data, setData] = useState<Record<string, string>[]>();
  useEffect(() => {
    getVgData(setData);
  }, []);

  if (data) {
    const vgData: VideoGame[] = data.map((row) => {
      const endDate = row["End Date"] ? new Date(row["End Date"]) : undefined;
      endDate && row["End Date"].length < 5 && endDate.setFullYear(endDate.getFullYear() + 1);
      return {
        game: row["Game"],
        platform: row["Platform"],
        company: row["Platform"].split(" ")[0]!,
        franchise: row["Franchise"],
        genre: row["Genre"].split("\n"),
        format: row["Format"] as Format,
        publisher: row["Publisher"],
        rating: row["Rating"],
        status: row["Status"] as Status,
        exactDate: row["Start Date"] && row["Start Date"].length > 5 ? true : false,
        startDate: row["Start Date"] ? new Date(row["Start Date"]) : undefined,
        endDate: endDate ? endDate : ["Playing", "Endless"].includes(row["Status"]) ? new Date() : undefined,
        hours: row["Hours"],
      };
    });
    return (
      <Fragment>
        <Timeline data={vgData} />
        <Piechart data={vgData} />
      </Fragment>
    );
  } else {
    console.log("no data");
    return <div />;
  }
};

const arrayToJson = (data: string[][]) => {
  const [header, ...rows] = data;
  return rows.map((row) => {
    const json: Record<string, string> = {};
    row.forEach((val, index) => (json[header[index]] = val));
    return json;
  });
};

const getVgData = (setData: (b: Record<string, string>[]) => void) => {
  console.log("fetching data");
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: "1JCAN_lB2QaVxj1rD4f88mN4tHjmhxF3CZlGtZGwYCLk",
      range: "Games List!A:Z",
    })
    .then((response) => response.result.values!)
    .then(arrayToJson)
    .then(setData);
};

export default VideoSheet;

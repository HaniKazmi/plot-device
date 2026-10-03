// The buckets the app's Artwork cells point into. A cell holds the full public URL with the
// object name unencoded — `https://storage.googleapis.com/hanikazmi_plotdevice_show/Ted Lasso` —
// and the app encodes it as an img.src does. `banner` offers a 16:9 crop and a logo laid over it,
// which is what a game's wallpaper often wants and a show's poster already carries.
export const MEDIA = {
  game: { label: "Game", bucket: "hanikazmi_plotdevice_vg", banner: true },
  show: { label: "Show", bucket: "hanikazmi_plotdevice_show" },
  movie: { label: "Movie", bucket: "hanikazmi_plotdevice_movie" },
};

// Spaces stay as the sheet writes them, but the app reads a cell through `new URL`, where `?` and
// `#` open a query or fragment and a bare `%` starts an escape — "What If...?" would ask the bucket
// for "What If..." — so those three are written escaped.
export const artworkUrl = (bucket, name) =>
  `https://storage.googleapis.com/${bucket}/${name.replace(/[%?#]/g, encodeURIComponent)}`;

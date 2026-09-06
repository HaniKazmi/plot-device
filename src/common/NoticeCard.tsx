import { Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

/**
 * A page with no page on it: a heading, a sentence saying what happened, and the one thing to do
 * about it.
 *
 * Two surfaces stand on it — the first visit, with nothing cached and nothing authorised, and a
 * throw the boundary above the outlet caught — and they are the same shape because they are the
 * same situation from the reader's side: the container is empty and something has to say why.
 * Stated once here, so the two cannot drift into two different apologies.
 *
 * `Paper` rather than `Card`, whose theme lights its border on hover: nothing here is hovered but
 * the action, and a card that answers the pointer without doing anything reads as a dead control.
 */
export const NoticeCard = ({ title, body, action }: { title: string; body: ReactNode; action: ReactNode }) => (
  <Paper
    variant="outlined"
    sx={{ maxWidth: 420, marginX: "auto", marginTop: 3, padding: 3 }}
  >
    <Stack
      spacing={1}
      sx={{ alignItems: "center", textAlign: "center" }}
    >
      <Typography variant="h6">{title}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
      >
        {body}
      </Typography>
      {action}
    </Stack>
  </Paper>
);

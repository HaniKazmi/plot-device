import { CardMedia, Chip, Dialog, SxProps, Theme } from "@mui/material";
import { useState } from "react";

export const CardMediaImage = ({
  image,
  alt,
  chip,
  ...props
}: {
  image?: string;
  alt: string;
  chip?: [string?, string?];
  height?: string;
  width?: string;
  sx?: SxProps<Theme>;
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  return (
    <>
      <div style={{ position: "relative", height: props.height, width: props.width }}>
        <CardMedia component="img" src={image} alt={alt} onClick={() => setDialogOpen(true)} {...props} />
        {chip &&
          <Chip sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            margin: 1,
            opacity: 0.8,
            bgcolor: chip[1],
            color: (theme) => chip[1] && theme.palette.getContrastText(chip[1])
          }} label={chip[0]} variant="filled" size="small" />
        }
      </div>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth={false}
        PaperProps={{ sx: { backgroundColor: "unset", boxShadow: "unset", backgroundImage: "unset" } }}
      >
        <img
          style={{ maxHeight: "calc(100vh - 64px)", objectFit: "contain", maxWidth: "100%", width: "100vw" }}
          src={image}
          alt={alt}
          onClick={() => setDialogOpen(false)}
        />
      </Dialog>
    </>
  );
};

import { CardMedia, Dialog, SxProps, Theme } from "@mui/material";
import { useState } from "react";

export const CardMediaImage = ({
  image,
  alt,
  ...props
}: {
  image?: string;
  alt: string;
  height?: string;
  width?: string;
  sx?: SxProps<Theme>;
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const content = <CardMedia component="img" src={image} alt={alt} onClick={() => setDialogOpen(true)} {...props} />;
  return (
    <>
      {content}
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

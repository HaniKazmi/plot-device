# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  channel = "stable-23.05"; # "stable-23.05" or "unstable"
  # Use https://search.nixos.org/packages to  find packages
  packages = [
    pkgs.nodejs
    pkgs.nodePackages.firebase-tools
  ];
  # Sets environment variables in the workspace
  env = { 
    "VITE_GOOGLE_CLIENT_ID" = "354295298450-sk6hsgh661q1our9cgk3o8phssj4ja8c.apps.googleusercontent.com";
    "VITE_GOOGLE_API_KEY" = "AIzaSyCwcAHd6A-m9eizmIwvCvfV1fHPu7l0mUA";
  };
  # search for the extension on https://open-vsx.org/ and use "publisher.id"
  idx.extensions = [
    # "vscodevim.vim"
  ];
  # runs when a workspace is first created with this `dev.nix` file
  # to run something each time the environment is rebuilt, use the `onStart` hook
  idx.workspace.onCreate = {
    npm-install = "npm install";
  };
  # preview configuration
  idx.previews = {
    enable = true;
    previews = [
      {
        command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
        manager = "web";
        id = "web";
      }
      {
        manager = "ios";
        id = "ios";
      }
    ];
  };
}

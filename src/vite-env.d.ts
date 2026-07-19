/// <reference types="vite/client" />
/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.client.sheets" />
/// <reference types="google.accounts" />
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

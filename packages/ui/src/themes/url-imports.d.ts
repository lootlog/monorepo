// Vite resolves `?url` imports to the asset's URL in the apps that bundle these modules.
declare module "*?url" {
  const url: string;
  export default url;
}

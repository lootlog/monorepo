export const parseNatsServersFromEnv = (natsServers: string) => {
  return natsServers ? natsServers.split(",") : [];
};

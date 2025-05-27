export const parseNatsServersFromEnv = (natsServers: string) => {
  const servers = natsServers ? natsServers.split(',') : [];

  return servers;
};

import { createHash } from 'crypto';

export const generateEventId = (data: any) => {
  const stringifiedData = JSON.stringify(data);
  return createHash('sha256').update(stringifiedData).digest('hex');
};

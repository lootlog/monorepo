import { getGuildIds } from './get-guild-ids';

describe('getGuildIds', () => {
  it('should extract guild IDs from guilds array', () => {
    const guilds = [
      { guild: { id: 'guild-1' }, roles: [] },
      { guild: { id: 'guild-2' }, roles: [] },
      { guild: { id: 'guild-3' }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(['guild-1', 'guild-2', 'guild-3']);
  });

  it('should return empty array for empty guilds input', () => {
    const result = getGuildIds([]);

    expect(result).toEqual([]);
  });

  it('should handle single guild', () => {
    const guilds = [{ guild: { id: 'guild-only' }, roles: [] }];

    const result = getGuildIds(guilds);

    expect(result).toEqual(['guild-only']);
  });

  it('should preserve order of guild IDs', () => {
    const guilds = [
      { guild: { id: 'guild-first' }, roles: [] },
      { guild: { id: 'guild-second' }, roles: [] },
      { guild: { id: 'guild-third' }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result[0]).toBe('guild-first');
    expect(result[1]).toBe('guild-second');
    expect(result[2]).toBe('guild-third');
  });

  it('should work with guilds having different properties', () => {
    const guilds = [
      {
        guild: { id: 'guild-1', name: 'Guild One' },
        roles: [{ name: 'admin' }],
        members: [],
      },
      {
        guild: { id: 'guild-2', name: 'Guild Two' },
        roles: [{ name: 'member' }],
        settings: {},
      },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(['guild-1', 'guild-2']);
  });

  it('should handle numeric guild IDs', () => {
    const guilds = [
      { guild: { id: '123' }, roles: [] },
      { guild: { id: '456' }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(['123', '456']);
  });
});

/**
 * Tests for battle actions parser
 *
 * This file validates the parsing logic independently from React components
 */

import { parseActions, hasAnyActions, getActionsCount } from './battle-actions-parser';

describe('parseActions', () => {
  it('should parse damage actions correctly', () => {
    const mockActions = [
      { actionType: '+dmgd', param: '150' },
      { actionType: '+dmgf', param: '75' },
      { actionType: '-dmgd', param: '50' }
    ];

    const result = parseActions(mockActions);

    expect(result.attackActions).toHaveLength(3);
    expect(result.attackActions).toContainEqual({ type: '+dmgd', value: '150' });
    expect(result.attackActions).toContainEqual({ type: '+dmgf', value: '75' });
    expect(result.attackActions).toContainEqual({ type: '-dmgd', value: '50' });
  });

  it('should parse heal actions correctly', () => {
    const mockActions = [
      { actionType: 'heal', param: '100' },
      { actionType: 'poison', param: '25,10' }
    ];

    const result = parseActions(mockActions);

    expect(result.passiveActions).toHaveLength(2);
    expect(result.passiveActions).toContainEqual({ type: 'heal', value: '100' });
    expect(result.passiveActions).toContainEqual({ type: 'poison', value: '25,10' });
  });

  it('should parse spell actions correctly', () => {
    const mockActions = [
      { actionType: 'tspell', param: 'Fireball' },
      { actionType: 'energy', param: '50' },
      { actionType: 'mana', param: '30' }
    ];

    const result = parseActions(mockActions);

    expect(result.spellActions).toHaveLength(3);
    expect(result.spellActions).toContainEqual({ type: 'tspell', value: 'Fireball' });
    expect(result.spellActions).toContainEqual({ type: 'energy', value: '50' });
    expect(result.spellActions).toContainEqual({ type: 'mana', value: '30' });
  });

  it('should parse buff actions correctly', () => {
    const mockActions = [
      { actionType: 'hp_per-allies', param: '10' },
      { actionType: 'heal_per-allies', param: '5' }
    ];

    const result = parseActions(mockActions);

    expect(result.buffActions).toHaveLength(2);
    expect(result.buffActions).toContainEqual({ type: 'hp_per-allies', value: '10' });
    expect(result.buffActions).toContainEqual({ type: 'heal_per-allies', value: '5' });
  });

  it('should parse outcome actions correctly', () => {
    const mockActions = [
      { actionType: 'winner', param: 'PlayerName' },
      { actionType: 'loser', param: 'EnemyName' }
    ];

    const result = parseActions(mockActions);

    expect(result.outcomeActions).toHaveLength(2);
    expect(result.outcomeActions).toContainEqual({ type: 'winner', value: 'PlayerName' });
    expect(result.outcomeActions).toContainEqual({ type: 'loser', value: 'EnemyName' });
  });

  it('should handle unknown action types with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const mockActions = [
      { actionType: 'unknown_action', param: 'test_value' }
    ];

    const result = parseActions(mockActions);

    expect(consoleSpy).toHaveBeenCalledWith('Unknown action type: unknown_action, param: test_value');
    expect(result.systemActions).toHaveLength(0);
    expect(result.spellActions).toHaveLength(0);
    // All other categories should be empty

    consoleSpy.mockRestore();
  });

  it('should ignore skillId actions', () => {
    const mockActions = [
      { actionType: 'skillId', param: '123' },
      { actionType: 'heal', param: '50' }
    ];

    const result = parseActions(mockActions);

    expect(result.passiveActions).toHaveLength(1);
    expect(result.passiveActions).toContainEqual({ type: 'heal', value: '50' });
    // skillId should be ignored, not appear in any category
  });

  it('should sort attack actions correctly', () => {
    const mockActions = [
      { actionType: '+crush', param: '20' },
      { actionType: '+dmgd', param: '150' },
      { actionType: '+crit', param: '1' }
    ];

    const result = parseActions(mockActions);

    // According to ATTACK_ACTIONS_SORT_ORDER: +dmgd, +crit, then +crush
    expect(result.attackActions[0].type).toBe('+dmgd');
    expect(result.attackActions[1].type).toBe('+crit');
    expect(result.attackActions[2].type).toBe('+crush');
  });

  it('should handle mixed action types', () => {
    const mockActions = [
      { actionType: '+dmgd', param: '150' },
      { actionType: 'heal', param: '50' },
      { actionType: 'tspell', param: 'Lightning Bolt' },
      { actionType: 'winner', param: 'Hero' },
      { actionType: 'hp_per-allies', param: '15' }
    ];

    const result = parseActions(mockActions);

    expect(result.attackActions).toHaveLength(1);
    expect(result.passiveActions).toHaveLength(1);
    expect(result.spellActions).toHaveLength(1);
    expect(result.outcomeActions).toHaveLength(1);
    expect(result.buffActions).toHaveLength(1);
  });

  it('should handle empty actions array', () => {
    const result = parseActions([]);

    expect(result.systemActions).toHaveLength(0);
    expect(result.buffActions).toHaveLength(0);
    expect(result.passiveActions).toHaveLength(0);
    expect(result.spellActions).toHaveLength(0);
    expect(result.attackActions).toHaveLength(0);
    expect(result.outcomeActions).toHaveLength(0);
  });
});

describe('hasAnyActions', () => {
  it('should return false for empty parsed actions', () => {
    const result = parseActions([]);
    expect(hasAnyActions(result)).toBe(false);
  });

  it('should return true when actions exist', () => {
    const mockActions = [{ actionType: 'heal', param: '50' }];
    const result = parseActions(mockActions);
    expect(hasAnyActions(result)).toBe(true);
  });
});

describe('getActionsCount', () => {
  it('should return correct count of all actions', () => {
    const mockActions = [
      { actionType: '+dmgd', param: '150' },
      { actionType: 'heal', param: '50' },
      { actionType: 'tspell', param: 'Fireball' }
    ];

    const result = parseActions(mockActions);
    expect(getActionsCount(result)).toBe(3);
  });

  it('should return 0 for empty actions', () => {
    const result = parseActions([]);
    expect(getActionsCount(result)).toBe(0);
  });
});
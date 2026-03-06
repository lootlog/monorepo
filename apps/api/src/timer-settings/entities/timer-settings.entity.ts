import { Expose, Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TimerSettingsEntity {
  @Exclude()
  id: number;

  @Expose()
  @ApiProperty({ example: 'user_id_123', description: 'User ID' })
  userId: string;

  @Expose()
  @ApiProperty({
    description: 'General timer behavior configuration',
    example: {
      removeTimerAfterMs: 30000,
      timersGrouping: false,
      timersUnderBag: false,
      countdownMode: 'max',
      compactView: false,
    },
  })
  generalConfig: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Timer display configuration',
    example: {
      showType: true,
      showLevel: false,
      fontSize: 11,
      minColumnWidth: 120,
      singleTimerDisplayMode: 'row',
    },
  })
  displayConfig: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Custom color definitions',
    example: {
      'color-1': {
        id: 'color-1',
        name: 'Red',
        borderColor: '#ff0000',
        backgroundColor: '#ffcccc',
      },
    },
  })
  customColors: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'NPC name to color ID mapping',
    example: { 'Npc Name': 'color-1' },
  })
  timersColors: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Custom names for default colors',
    example: { 'default-red': 'My Red' },
  })
  defaultColorNames: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Overridden default colors',
    example: {
      'default-red': { borderColor: '#ff0000', backgroundColor: '#ffcccc' },
    },
  })
  overriddenDefaultColors: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Array of hidden default color IDs',
    example: ['default-red', 'default-blue'],
  })
  hiddenDefaultColors: Record<string, unknown>;

  @Expose()
  @ApiProperty({
    description: 'Global filter toggle',
    example: true,
  })
  timerFiltersEnabled: boolean;

  @Expose()
  @ApiProperty({
    description: 'Color filter toggle',
    example: false,
  })
  colorFiltersEnabled: boolean;

  @Expose()
  @ApiProperty({
    description: 'Global sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  timersSortOrder: string;

  @Expose()
  @ApiProperty({
    description: 'Enable/disable settings synchronization',
    example: true,
  })
  syncEnabled: boolean;

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

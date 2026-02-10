import { ApiProperty } from '@nestjs/swagger';

class AddonTypeBundleFileEntity {
  @ApiProperty({ example: 'file:///src/types/margonem/hero.ts' })
  path: string;

  @ApiProperty({ description: 'Raw TypeScript source content' })
  content: string;
}

export class AddonTypeBundleEntity {
  @ApiProperty({ type: [AddonTypeBundleFileEntity] })
  files: AddonTypeBundleFileEntity[];

  @ApiProperty({
    description:
      'Extra declaration for addon SDK module available in runtime',
  })
  sdkDeclaration: string;

  @ApiProperty({
    example: {
      baseUrl: 'file:///src',
      paths: {
        '@/*': ['*'],
      },
    },
  })
  compilerHints: {
    baseUrl: string;
    paths: Record<string, string[]>;
  };
}

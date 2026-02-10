import { BadRequestException } from '@nestjs/common';
import { extractAddonMetadataFromSource } from 'src/user-addons/utils/extract-addon-metadata-from-source';

describe('extractAddonMetadataFromSource', () => {
  it('extracts metadata from ESM defineAddon call', () => {
    const sourceCode = `
      import { defineAddon } from "@lootlog/addon-sdk";

      export default defineAddon({
        id: "my-addon",
        name: "My Addon",
        description: "My description",
        version: "1.2.3",
        setup() {},
      });
    `;

    expect(extractAddonMetadataFromSource(sourceCode)).toEqual({
      id: 'my-addon',
      name: 'My Addon',
      description: 'My description',
      version: '1.2.3',
    });
  });

  it('extracts metadata from CommonJS defineAddon call', () => {
    const sourceCode = `
      const { defineAddon } = require("@lootlog/addon-sdk");

      module.exports.default = defineAddon({
        id: "my-addon-cjs",
        name: "My Addon CJS",
        setup() {},
      });
    `;

    expect(extractAddonMetadataFromSource(sourceCode)).toEqual({
      id: 'my-addon-cjs',
      name: 'My Addon CJS',
      description: undefined,
      version: undefined,
    });
  });

  it('throws when defineAddon call is missing', () => {
    const sourceCode = `
      export default {
        id: "my-addon",
        name: "My Addon",
      };
    `;

    expect(() => extractAddonMetadataFromSource(sourceCode)).toThrow(
      BadRequestException,
    );
  });

  it('throws when required metadata field is missing', () => {
    const sourceCode = `
      import { defineAddon } from "@lootlog/addon-sdk";

      export default defineAddon({
        name: "My Addon",
        setup() {},
      });
    `;

    expect(() => extractAddonMetadataFromSource(sourceCode)).toThrow(
      'missing required "id"',
    );
  });

  it('throws when metadata field is not a string literal', () => {
    const sourceCode = `
      import { defineAddon } from "@lootlog/addon-sdk";

      export default defineAddon({
        id: "my-addon",
        name: addonName,
        setup() {},
      });
    `;

    expect(() => extractAddonMetadataFromSource(sourceCode)).toThrow(
      'field "name" must be a string literal',
    );
  });
});

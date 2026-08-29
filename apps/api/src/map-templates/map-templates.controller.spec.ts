import { Permission } from "#src/generated/prisma/client";
import { PERMISSIONS_KEY } from "#src/shared/permissions/permissions.decorator";
import { MapTemplatesController } from "./map-templates.controller.js";

describe("MapTemplatesController", () => {
  const mockMapTemplatesService = {
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  };

  let controller: MapTemplatesController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MapTemplatesController(mockMapTemplatesService as never);
  });

  it("declares permissions metadata for access and manage endpoints", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        MapTemplatesController.prototype.getTemplates,
      ),
    ).toEqual([Permission.LOOTLOG_ACCESS]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        MapTemplatesController.prototype.createTemplate,
      ),
    ).toEqual([Permission.LOOTLOG_MANAGE]);
  });

  it("delegates template operations with the guild id", () => {
    controller.getTemplates({ id: "guild-1" });
    controller.createTemplate({ id: "guild-1" }, { name: "Template" } as never);
    controller.updateTemplate({ id: "guild-1" }, "template-1", {
      name: "Updated",
    } as never);
    controller.deleteTemplate({ id: "guild-1" }, "template-1");

    expect(mockMapTemplatesService.getTemplates).toHaveBeenCalledWith(
      "guild-1",
    );
    expect(mockMapTemplatesService.createTemplate).toHaveBeenCalledWith(
      "guild-1",
      { name: "Template" },
    );
    expect(mockMapTemplatesService.updateTemplate).toHaveBeenCalledWith(
      "guild-1",
      "template-1",
      { name: "Updated" },
    );
    expect(mockMapTemplatesService.deleteTemplate).toHaveBeenCalledWith(
      "guild-1",
      "template-1",
    );
  });
});

import { PrismaService } from 'src/db/prisma.service';

const prisma = new PrismaService();

// Predefined map templates for common Margonem event scenarios
const MAP_TEMPLATES = [
  {
    name: 'Ithan - Wszystkie lokacje',
    world: 'ithan',
    maps: [
      'Ithan',
      'Wioska Ithan',
      'Las Ithan',
      'Góry Ithan',
      'Pustkowia Ithan',
      'Jaskinie Ithan',
    ],
    heroNpcs: [],
  },
  {
    name: 'Tempest - Lokacje eventowe',
    world: 'tempest',
    maps: [
      'Arena Tempest',
      'Wieża Magów',
      'Zamek Cieni',
      'Lodowe Pustkowia',
      'Ogniste Jaskinie',
    ],
    heroNpcs: [
      { npcId: 1001, npcName: 'Władca Cieni', mapName: 'Zamek Cieni' },
      { npcId: 1002, npcName: 'Lodowy Gigant', mapName: 'Lodowe Pustkowia' },
    ],
  },
  {
    name: 'Gefion - Herosy',
    world: 'gefion',
    maps: [
      'Królestwo Gefion',
      'Mroczne Podziemia',
      'Wieża Nekromantów',
      'Pustynia Zagłady',
    ],
    heroNpcs: [
      { npcId: 2001, npcName: 'Nekromanta', mapName: 'Wieża Nekromantów' },
      { npcId: 2002, npcName: 'Pustynny Władca', mapName: 'Pustynia Zagłady' },
    ],
  },
  {
    name: 'Jaruna - Polowanie na herosa',
    world: 'jaruna',
    maps: [
      'Jaruna Miasto',
      'Mroczny Las',
      'Góry Jaruna',
      'Lodowa Dolina',
      'Wulkan',
    ],
    heroNpcs: [
      { npcId: 3001, npcName: 'Leśny Strażnik', mapName: 'Mroczny Las' },
      { npcId: 3002, npcName: 'Górski Olbrzym', mapName: 'Góry Jaruna' },
      { npcId: 3003, npcName: 'Lodowy Smok', mapName: 'Lodowa Dolina' },
      { npcId: 3004, npcName: 'Ognisty Demon', mapName: 'Wulkan' },
    ],
  },
];

async function seedMapTemplates() {
  console.log('🌱 Seeding map templates...');

  for (const template of MAP_TEMPLATES) {
    const existing = await prisma.eventMapTemplate.findFirst({
      where: {
        name: template.name,
        world: template.world,
      },
    });

    if (existing) {
      console.log(`  ⏭️ Template "${template.name}" already exists, skipping`);
      continue;
    }

    await prisma.eventMapTemplate.create({
      data: {
        name: template.name,
        world: template.world,
        maps: template.maps,
        heroNpcs: template.heroNpcs,
      },
    });

    console.log(`  ✅ Created template: ${template.name}`);
  }

  console.log('✨ Map templates seeded successfully!');
}

seedMapTemplates()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

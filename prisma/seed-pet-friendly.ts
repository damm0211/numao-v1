import { PrismaClient, PetFriendlyPlaceType } from '@prisma/client';

const prisma = new PrismaClient();

const places = [
  {
    name: 'Parque Bicentenario',
    type: PetFriendlyPlaceType.PARK,
    address: 'Av. Bicentenario 3800',
    commune: 'Vitacura',
    description: 'Parque urbano amplio para caminatas y actividades al aire libre con mascotas.',
  },
  {
    name: 'Parque Araucano',
    type: PetFriendlyPlaceType.PARK,
    address: 'Av. Presidente Riesco 5698',
    commune: 'Las Condes',
    description: 'Área verde amplia para paseos y socialización.',
  },
  {
    name: 'Parque Inés de Suárez',
    type: PetFriendlyPlaceType.PARK,
    address: 'Av. Francisco Bilbao 2229',
    commune: 'Providencia',
    description: 'Parque urbano utilizado para paseos y actividades con perros.',
  },
  {
    name: 'Parque de los Reyes',
    type: PetFriendlyPlaceType.PARK,
    address: 'Presidente Balmaceda',
    commune: 'Santiago',
    description: 'Espacio amplio para caminar y realizar actividades al aire libre.',
  },
  {
    name: 'Café Forestal',
    type: PetFriendlyPlaceType.CAFE,
    address: 'Ismael Valdés Vergara 490',
    commune: 'Santiago',
    description: 'Terraza urbana frente al Parque Forestal.',
  },
  {
    name: 'Café del 10',
    type: PetFriendlyPlaceType.CAFE,
    address: 'Morandé 243',
    commune: 'Santiago',
    description: 'Cafetería con patio interior donde se reciben mascotas.',
  },
  {
    name: 'Wonderland Café',
    type: PetFriendlyPlaceType.CAFE,
    address: 'Providencia',
    commune: 'Providencia',
    description: 'Cafetería reportada como alternativa pet friendly.',
  },
  {
    name: 'Jardín Mallinkrodt',
    type: PetFriendlyPlaceType.RESTAURANT,
    address: 'Mallinkrodt',
    commune: 'Providencia',
    description: 'Espacio gastronómico al aire libre reportado como pet friendly.',
  },
  {
    name: 'Holm',
    type: PetFriendlyPlaceType.RESTAURANT,
    address: 'Vitacura',
    commune: 'Vitacura',
    description: 'Restaurante con espacios exteriores reportados como aptos para mascotas.',
  },
  {
    name: 'Quinoa Restaurante',
    type: PetFriendlyPlaceType.RESTAURANT,
    address: 'Las Condes',
    commune: 'Las Condes',
    description: 'Restaurante con alternativas para una salida acompañada de mascotas.',
  },
];

async function main() {
  for (const place of places) {
    await prisma.petFriendlyPlace.upsert({
      where: {
        id: `${place.commune}-${place.name}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      },
      update: {
        ...place,
        active: true,
      },
      create: {
        id: `${place.commune}-${place.name}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        ...place,
        verified: false,
        active: true,
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

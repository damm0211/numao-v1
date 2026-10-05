# NUMAO V1 — Starter

Base modular para comenzar la construcción de NUMAO.

## Stack
- API: NestJS + TypeScript
- ORM: Prisma
- DB: PostgreSQL 16
- Web: Next.js + TypeScript
- Infra local: Docker Compose

## Módulos iniciales
- auth
- users
- pets
- discovery
- compatibility
- connections
- conversations
- meetups
- moderation

## Inicio rápido

1. Copiar `.env.example` a `.env`.
2. Ejecutar:

```bash
docker compose up -d db
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

La API queda preparada para `http://localhost:3001` y la web para `http://localhost:3000`.

> Esta es una base de desarrollo V1. Antes de producción deben añadirse proveedor de email, almacenamiento de imágenes, gestión de secretos, observabilidad, backups, rate limiting distribuido y pruebas automatizadas completas.

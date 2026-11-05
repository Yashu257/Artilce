/**
 * Seed — `npm run seed` (also wired as the Prisma seed command).
 *
 * Source of truth: prisma/seed-data.json, generated verbatim from
 *   extracted/Artilce-main/frontend/src/data/sampleArticles.js
 * (9 articles, 4 categories — titles, summaries, authors, published
 * dates, pdf names/pages, slide images and full section content are
 * preserved exactly; nothing is invented).
 * PDFs: backend/uploads/*.pdf — Document rows point at those files.
 *
 * Demo users (passwords are bcrypt hashes only; change them in prod):
 *   doctor@example.com / Doctor123!  (Dr. Sarah Mitchell, MD — doctor)
 *   admin@cipla.example / Admin123! (admin — admin-module testing only)
 *
 * Requires DATABASE_URL (MySQL). Run after `prisma migrate deploy`.
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
}
interface SeedArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  published_at: string;
  author: string;
  reading_time: string;
  pdf_name: string;
  pdf_pages: number;
  thumbnail_url: string;
  slide_images: string[];
  sections: unknown[];
}
interface SeedData {
  categories: SeedCategory[];
  articles: SeedArticle[];
  fileSizes: Record<string, number>;
}

async function main(): Promise<void> {
  const dataPath = path.join(__dirname, 'seed-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as SeedData;

  // Deterministic document ids, MUST match services/ingestion.ts
  // documentIdFor(): the ingestion run upserts by this id, so seeding
  // with the same id means ingest updates the seeded row instead of
  // creating a duplicate Document row for the same PDF.
  const documentIdFor = (fileName: string): string =>
    'doc-' +
    fileName
      .toLowerCase()
      .replace(/\.pdf$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  // --- Users (upsert by email; re-hashing on every seed keeps the demo
  // passwords deterministic even after a manual password change) ---
  const users = [
    {
      name: 'Dr. Sarah Mitchell, MD',
      email: 'doctor@example.com',
      password: 'Doctor123!',
      role: 'doctor',
    },
    {
      name: 'Cipla Admin',
      email: 'admin@cipla.example',
      password: 'Admin123!',
      role: 'admin',
    },
  ];
  const userByEmail = new Map<string, string>();
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: u.role,
        isActive: true,
      },
    });
    userByEmail.set(u.email, user.id);
  }

  // --- Categories ---
  for (const c of data.categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { name: c.name, slug: c.slug, description: c.description },
    });
  }

  // --- Articles + Documents ---
  const adminId = userByEmail.get('admin@cipla.example');
  for (const a of data.articles) {
    const content = JSON.stringify({
      author: a.author,
      readingTime: a.reading_time,
      pdfFileName: a.pdf_name,
      pdfPages: a.pdf_pages,
      thumbnailUrl: a.thumbnail_url,
      slideImages: a.slide_images,
      sections: a.sections,
    });
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        summary: a.summary,
        category: a.category,
        content,
        status: 'published',
        pdfFileName: a.pdf_name,
        pdfPages: a.pdf_pages,
        thumbnailUrl: a.thumbnail_url,
        publishedAt: new Date(a.published_at),
      },
      create: {
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        category: a.category,
        content,
        status: 'published',
        pdfFileName: a.pdf_name,
        pdfPages: a.pdf_pages,
        thumbnailUrl: a.thumbnail_url,
        publishedAt: new Date(a.published_at),
      },
    });

    // One Document row per PDF. Status is `pending`: the RAG ingestion
    // pipeline (npm run ingest) extracts text, chunks it and flips the
    // document to `ready`. Do not seed as `ready` — no chunks exist yet.
    const size = data.fileSizes[a.pdf_name] ?? 0;
    const existing = await prisma.document.findFirst({ where: { fileName: a.pdf_name } });
    if (existing) {
      await prisma.document.update({
        where: { id: existing.id },
        data: { title: a.title, category: a.category, size, pageCount: a.pdf_pages },
      });
    } else {
      await prisma.document.create({
        data: {
          id: documentIdFor(a.pdf_name),
          title: a.title,
          fileName: a.pdf_name,
          mimeType: 'application/pdf',
          size,
          category: a.category,
          status: 'pending',
          pageCount: a.pdf_pages,
          version: 1,
          uploadedById: adminId ?? null,
        },
      });
    }
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.article.count(),
    prisma.document.count(),
  ]);
  console.log(
    `Seed complete: ${counts[0]} users, ${counts[1]} categories, ${counts[2]} articles, ${counts[3]} documents.`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

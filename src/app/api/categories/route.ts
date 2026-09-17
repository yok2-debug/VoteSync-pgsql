import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, parseJsonBody, verifyAdminSession } from '../lib/api-helpers';
import { acquireElectionOperationLock } from '@/lib/election-lock';

const categorySchema = z.object({
  isEditing: z.boolean().optional(),
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1),
  allowedElections: z.array(z.string().min(1)),
});

const deleteCategorySchema = z.object({
  categoryId: z.string().min(1),
});

export async function GET() {
  try {
    await verifyAdminSession();

    const categories = await prisma.category.findMany();

    // Map database fields to frontend fields
    const mappedCategories = (categories || []).map((c: { id: string; name: string; slug: string | null; allowedElections: string[] }) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      allowedElections: c.allowedElections || [],
    }));

    return NextResponse.json({ data: mappedCategories }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdminSession('categories');
    const result = categorySchema.safeParse(await parseJsonBody(request));

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { isEditing, id, name, allowedElections } = result.data;

    let categoryId = id;

    if (isEditing) {
      if (!categoryId) {
        return NextResponse.json({ message: 'ID Kategori wajib diisi untuk pengeditan.' }, { status: 400 });
      }

      // Perubahan allowedElections memengaruhi hak suara.
      // Serialize terhadap proses voting yang menggunakan shared lock.
      await prisma.$transaction(async (tx) => {
        await acquireElectionOperationLock(tx, 'exclusive');

        await tx.category.update({
          where: { id: categoryId },
          data: {
            name,
            slug: name ? name.replace(/\s+/g, '').toLowerCase() : '',
            allowedElections: allowedElections || [],
          }
        });
      });

      return NextResponse.json({ message: 'Kategori berhasil diperbarui', id: categoryId }, { status: 200 });
    } else {
      const newCategoryId = `category-${Date.now()}`;

      await prisma.category.create({
        data: {
          id: newCategoryId,
          name,
          slug: name ? name.replace(/\s+/g, '').toLowerCase() : '',
          allowedElections: allowedElections || [],
        }
      });

      return NextResponse.json({ message: 'Kategori berhasil dibuat', id: newCategoryId }, { status: 201 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdminSession('categories');
    const result = deleteCategorySchema.safeParse(await parseJsonBody(request));

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { categoryId } = result.data;

    const deleted = await prisma.$transaction(async (tx) => {
      // Serialize category deletion against voting and other operations
      // that can change voter eligibility.
      await acquireElectionOperationLock(tx, 'exclusive');

      // Check whether the category is currently assigned to any voter.
      // The check and delete must occur under the same transaction/lock.
      const voterCount = await tx.voter.count({
        where: { categoryId }
      });

      if (voterCount > 0) {
        return false;
      }

      await tx.category.delete({
        where: { id: categoryId }
      });

      return true;
    });

    if (!deleted) {
      return NextResponse.json(
        { message: 'Kategori tidak dapat dihapus karena masih digunakan oleh pemilih.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: 'Kategori berhasil dihapus' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

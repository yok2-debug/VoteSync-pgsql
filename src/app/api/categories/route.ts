import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, verifyAdminSession } from '../lib/api-helpers';

export async function GET() {
  try {
    await verifyAdminSession();

    const categories = await prisma.category.findMany();

    // Map database fields to frontend fields
    const mappedCategories = (categories || []).map((c) => ({
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
    const data = await request.json();
    const { isEditing, id, name, allowedElections } = data;

    let categoryId = id;

    if (isEditing) {
      if (!categoryId) {
        return NextResponse.json({ message: 'ID Kategori wajib diisi untuk pengeditan.' }, { status: 400 });
      }

      await prisma.category.update({
        where: { id: categoryId },
        data: {
          name,
          slug: name ? name.replace(/\s+/g, '').toLowerCase() : '',
          allowedElections: allowedElections || [],
        }
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
    const { categoryId } = await request.json();

    if (!categoryId) {
      return NextResponse.json({ message: 'ID Kategori wajib diisi' }, { status: 400 });
    }

    // Check if category is in use by voters
    const voters = await prisma.voter.findMany({
      where: { categoryId },
      select: { id: true }
    });

    if (voters && voters.length > 0) {
      return NextResponse.json({ message: 'Kategori tidak dapat dihapus karena masih digunakan oleh pemilih.' }, { status: 409 });
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({ message: 'Kategori berhasil dihapus' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

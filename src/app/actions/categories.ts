'use server';

import { prisma } from '@/lib/prisma';
import type { Category } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const categoryIdSchema = z.string().min(1);

const categoryCreateSchema = z.object({
    name: z.string().trim().min(3),
});

const categoryUpdateSchema = categoryCreateSchema.partial();

export async function getCategories(): Promise<{ success: boolean; data?: Category[]; message?: string }> {
    try {
        await verifyAdminSession(); // Read access for any admin

        const categoriesData = await prisma.category.findMany();

        if (!categoriesData || categoriesData.length === 0) {
            return { success: true, data: [] };
        }

        const categories = categoriesData.map((c: { id: string; name: string; allowedElections: string[] }) => ({
            id: c.id,
            name: c.name,
            allowedElections: c.allowedElections || [],
        })) as Category[];

        return { success: true, data: categories };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed fetching categories');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching categories');
        return { success: false, message: 'Gagal mengambil data kategori.' };
    }
}

export async function createCategory(
    data: Omit<Category, 'id'>
): Promise<{ success: boolean; message?: string; data?: Category }> {
    try {
        await verifyAdminSession('categories');

        const dataResult = categoryCreateSchema.safeParse(data);
        if (!dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validData = dataResult.data;

        const categoryId = `category-${Date.now()}`;
        const slug = validData.name.replace(/\s+/g, '').toLowerCase();

        await prisma.category.create({
            data: {
                id: categoryId,
                name: validData.name,
                slug: slug,
            }
        });

        const newCategory: Category = { id: categoryId, name: validData.name };

        logger.info({ categoryId }, 'Category created');
        return { success: true, data: newCategory, message: 'Kategori berhasil dibuat.' };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed creating category');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error creating category');
        return { success: false, message: 'Gagal membuat kategori.' };
    }
}

export async function updateCategory(
    id: string,
    data: Partial<Omit<Category, 'id'>>
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('categories');

        const idResult = categoryIdSchema.safeParse(id);
        const dataResult = categoryUpdateSchema.safeParse(data);
        if (!idResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validId = idResult.data;
        const validData = dataResult.data;

        if (Object.keys(validData).length === 0) {
            return { success: false, message: 'Data tidak valid.' };
        }

        const existing = await prisma.category.findUnique({
            where: { id: validId }
        });

        if (!existing) {
            return { success: false, message: 'Kategori tidak ditemukan.' };
        }

        const updateData: any = {};
        if (validData.name !== undefined) {
            updateData.name = validData.name;
            updateData.slug = validData.name.replace(/\s+/g, '').toLowerCase();
        }

        await prisma.category.update({
            where: { id: validId },
            data: updateData
        });

        logger.info({ categoryId: validId }, 'Category updated');
        return { success: true, message: 'Kategori berhasil diperbarui.' };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, categoryId: id }, 'Authentication failed updating category');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error updating category');
        return { success: false, message: 'Gagal memperbarui kategori.' };
    }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('categories');

        const idResult = categoryIdSchema.safeParse(id);
        if (!idResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validId = idResult.data;

        const existing = await prisma.category.findUnique({
            where: { id: validId }
        });

        if (!existing) {
            return { success: false, message: 'Kategori tidak ditemukan.' };
        }

        await prisma.category.delete({
            where: { id: validId }
        });

        logger.info({ categoryId: validId }, 'Category deleted');
        return { success: true, message: 'Kategori berhasil dihapus.' };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, categoryId: id }, 'Authentication failed deleting category');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error deleting category');
        return { success: false, message: 'Gagal menghapus kategori.' };
    }
}

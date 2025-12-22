'use server';

import { prisma } from '@/lib/prisma';
import type { Category } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

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

        const categoryId = `category-${Date.now()}`;
        const slug = data.name ? data.name.replace(/\s+/g, '').toLowerCase() : '';

        await prisma.category.create({
            data: {
                id: categoryId,
                name: data.name,
                slug: slug,
            }
        });

        const newCategory: Category = { id: categoryId, name: data.name };

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

        const existing = await prisma.category.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, message: 'Kategori tidak ditemukan.' };
        }

        const updateData: any = {};
        if (data.name !== undefined) {
            updateData.name = data.name;
            updateData.slug = data.name.replace(/\s+/g, '').toLowerCase();
        }

        await prisma.category.update({
            where: { id },
            data: updateData
        });

        logger.info({ categoryId: id }, 'Category updated');
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

        const existing = await prisma.category.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, message: 'Kategori tidak ditemukan.' };
        }

        await prisma.category.delete({
            where: { id }
        });

        logger.info({ categoryId: id }, 'Category deleted');
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

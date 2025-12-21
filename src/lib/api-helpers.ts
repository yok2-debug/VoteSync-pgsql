import { prisma } from '@/lib/prisma';

export async function checkUsernameExists(username: string, userIdToExclude?: string): Promise<boolean> {
    const users = await prisma.appUser.findMany({
        where: { username },
        select: { id: true, username: true }
    });

    if (!users) return false;

    for (const user of users) {
        if (user.id !== userIdToExclude && user.username === username) {
            return true;
        }
    }
    return false;
}

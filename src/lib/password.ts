import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
}

export function generateReadablePassword(length: number = 5): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes I, 1, O, 0
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

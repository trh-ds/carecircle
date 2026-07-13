// src/lib/auth.ts
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/JWT'
import db from '@/lib/db'

export interface Session {
    userId: string
    email: string
    jti: string
    exp: number
}

export async function getSession(): Promise<Session | null> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
        return null
    }

    const token = sessionCookie.value

    try {
        const decoded = verifyToken(token)

        const [rows] = await db.execute(
            'SELECT id FROM token_blacklist WHERE jti = ?',
            [decoded.jti]
        )
        if (Array.isArray(rows) && rows.length > 0) {
            return null
        }

        return {
            userId: decoded.userId,
            email: decoded.email,
            jti: decoded.jti,
            exp: decoded.exp,
        }
    } catch {
        return null
    }
}
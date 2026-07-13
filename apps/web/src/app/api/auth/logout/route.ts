import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { verifyToken } from '@/lib/JWT'

export async function POST(req: NextRequest) {
    const token = req.cookies.get('session')?.value

    if (token) {
        try {
            const decoded = verifyToken(token)    
            await db.execute(
                'INSERT INTO token_blacklist (jti, expires_at) VALUES (?, FROM_UNIXTIME(?))',
                [decoded.jti, decoded.exp]
            )
        } catch {
        }
    }

    const response = NextResponse.json({ success: true }, { status: 200 })
    response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: -1,
    })

    return response
}
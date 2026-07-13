import db from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { signToken } from '@/lib/JWT'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const { email, password } = await req.json()

    if (!email || !password) {
        return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const [rows] = await db.execute(
        'SELECT id, email, password_hash FROM users WHERE email = ? AND deleted_at IS NULL',
        [email]
    )

    // Guard + cast: this fixes the TypeScript error
    if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const user = (rows as any[])[0]

    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])

    const token = signToken({ userId: user.id, email: user.email })

    const response = NextResponse.json(
        { user: { id: user.id, email: user.email } },
        { status: 200 }
    )

    response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,   // 7 days
    })

    return response
}
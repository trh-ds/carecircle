import db from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/JWT'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { email, password, phone, full_name, preferred_language } = await req.json()

  if (!email || !password || !full_name || !phone || !preferred_language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
  if (Array.isArray(rows) && rows.length > 0) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  const hashed = await hashPassword(password)
  const userId = crypto.randomUUID()

  try {
    await db.execute(
      `INSERT INTO users (id, email, phone, full_name, preferred_language, metadata, password_hash, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, email, phone, full_name, preferred_language, JSON_OBJECT(), hashed]
    )
  } catch (err: any) {
    if (err.errno === 1062) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }
    throw err 
  }

  const user = { id: userId, email }

  const token = signToken({ userId: user.id, email: user.email })

  const response = NextResponse.json(
    { user: { id: user.id, email: user.email } },
    { status: 201 }
  )

  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
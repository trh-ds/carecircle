import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export function signToken(payload: { userId: string; email: string; jti?: string }) {
    const jti = payload.jti || crypto.randomUUID()
    return jwt.sign(
        { userId: payload.userId, email: payload.email, jti },
        JWT_SECRET,
        { expiresIn: '7d' }
    )
}

export function verifyToken(token: string) {
    // The JWT library always adds `iat` and `exp` when verifying.
    // Include them in the return type so you can use them.
    return jwt.verify(token, JWT_SECRET) as {
        userId: string
        email: string
        jti: string
        exp: number    // ← standard JWT expiration claim
        iat: number    // ← optional, added automatically
    }
}
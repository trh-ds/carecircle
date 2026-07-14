import db from '@/lib/db'
import crypto from 'crypto'
import { getSession } from '@/helpers/checkAuth'
import { NextResponse } from 'next/server'


export async function POST(req:Request){

    const session = await getSession();
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { name, tenant_timezone} = await req.json();
    if(!name || !tenant_timezone){
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const circleId = crypto.randomUUID();
    const userId = session.userId;
    const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        await db.execute(
            `INSERT INTO circles (id, name, tenant_timezone, created_by, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [circleId, name, tenant_timezone, userId, createTime]
        )

        await  db.execute(
            `UPDATE TABLE users`
        )
        return NextResponse.json({ message: 'Circle created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating circle:', error);
        return NextResponse.json({ error: 'Failed to create circle' }, { status: 500 });
    }




}

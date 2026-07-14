import db from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSession } from '@/helpers/checkAuth'


export async function POST(req: Request) {
    const { circle_id, user_id, user_role } = await req.json();

    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!circle_id || !user_id || !user_role) {
        return NextResponse.json({ error: "Missing required feild" }, { status: 400 })
    }

    const joined_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    


    try {
        await db.execute(
            `INSERT INTO circle_members (circle_id, user_id, joined_at,role)
             VALUES (?, ?, ?, ?)`,
            [circle_id, user_id, joined_at,user_role]
        )

        return NextResponse.json(
            { message: "Circle Joined Successfully" },
            { status: 200 })

    } catch (err) {
        return NextResponse.json(
            { error: `Some error occurred while joining the circle \n${err}` },
            { status: 500 }
        );
    }


}
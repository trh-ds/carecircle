import db from"@/lib/db"
import { NextResponse } from "next/server"
import { getSession } from "@/helpers/checkAuth"

export async function GET(req : Request){

    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(req)
    const [rows] = await db.execute('SELECT name from circles');
    return NextResponse.json({circles: rows}, {status: 200})
    
}
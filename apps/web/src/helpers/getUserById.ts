import db from '../lib/db';
import { RowDataPacket } from 'mysql2';

interface UserNameRow extends RowDataPacket {
    full_name: string;
}

export async function getUserName(user_id: string): Promise<string | null> {
    const [rows] = await db.execute<UserNameRow[]>(
        `SELECT full_name FROM users WHERE id = ?`,
        [user_id]
    );

    if (rows.length > 0) {
        console.log(rows[0].full_name)
        return rows[0].full_name;   
    }

    return null;
}

getUserName('cf448052-2e4a-4b24-ba1a-ad638b19a06d')
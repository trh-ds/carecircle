export interface User {
    id: string;
    email: string;
    phone: string | null;
    full_name: string;
    preferred_language: string | null;
    last_login_at: Date | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}
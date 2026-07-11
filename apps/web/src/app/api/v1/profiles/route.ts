import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { type User } from "@/types";

const supabase = createServerClient();

export async function GET(req:NextRequest) {
    const {data,error} = await supabase.from('users').select('*').returns<User[]>();

    if(error){
        console.log("Something went wrong \n");
        // console.log(error);
        return NextResponse.json({error:error.message},{status:500});
    }

    return NextResponse.json({data:data},{status:200});
    
}


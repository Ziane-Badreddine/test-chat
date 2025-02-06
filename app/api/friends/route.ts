import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // 1. Authenticate user with Clerk
    const { userId: clerkId } = await auth();

    if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 2. Get current user's database UUID
        const { data: currentUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 3. Get friend's database UUID from request body
        const { friend_id } = await req.json();

        // 4. Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(friend_id)) {
            return NextResponse.json({ error: "Invalid friend ID format" }, { status: 400 });
        }

        // 5. Check existing friendships
        const { data: existingFriendship } = await supabase
            .from("friends")
            .select("*")
            .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${currentUser.id})`)
            .maybeSingle();

        if (existingFriendship) {
            return NextResponse.json({
                error: "Friendship already exists",
                status: existingFriendship.status
            }, { status: 400 });
        }

        // 6. Create new friendship request with sender_id
        const { data, error } = await supabase
            .from("friends")
            .insert([{
                user_id: currentUser.id,
                friend_id: friend_id,
                sender_id: currentUser.id, // Ajout de sender_id
                status: "pending"
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: "Friend request sent",
            friendship: data
        }, { status: 201 });

    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}



export async function GET(req: NextRequest) {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get database user ID
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = userData.id;

        const { data, error } = await supabase
            .from("friends")
            .select(`
                id,
                status,
                created_at,
                sender:sender_id(*),
                user:user_id(*),
                friend:friend_id(*)
            `)
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
            .or(`status.eq."accepted",status.eq."pending"`)

        if (error) {
            console.error("Error fetching friends:", error.message);
            return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
        }

        const friendships = data.map(friendship => ({
            id: friendship.id,
            status: friendship.status,
            created_at: friendship.created_at,
            isSender: friendship.sender.id === userData.id ,
            friend: friendship.user.id === userData.id 
                   ? friendship.friend 
                   : friendship.user
        }));


        return NextResponse.json(friendships, { status: 200 });

    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

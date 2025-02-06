import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {

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
        const { content, receiver_id, media_url } = await req.json();


        const { error } = await supabase
            .from("messages")
            .insert([{
                sender_id: currentUser.id,
                content: content,
                receiver_id: receiver_id,
                media_url: media_url,
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: "Friend request sent",
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
        // Récupération de l'utilisateur
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError) {
            console.error("User fetch error:", userError.message);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = userData.id;

        // Requête optimisée pour les messages
        const { data, error } = await supabase
            .from("messages")
            .select(`
                id,
                content,
                media_url,
                seen,
                created_at,
                sender:sender_id(id,username,avatar_url),
                receiver:receiver_id(id,username,avatar_url)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error.message);
            return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
        }

        // Formatage de la réponse
        const formattedData = data.map(message  => ({
            ...message,
            isSender: message.sender.id === userId,
            interlocutor: message.sender.id === userId
                ? message.receiver
                : message.sender
        }));

        return NextResponse.json(formattedData, { status: 200 });

    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}


export async function PATCH(req: NextRequest) {
    try {
        // 1. Authenticate the user
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get the current user's ID from Supabase
        const { data: currentUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const {sender_id} = await req.json()

        const receiverId = currentUser.id;

        // 3. Fetch all unseen messages for the user
        const { data: messages, error: fetchError } = await supabase
            .from("messages")
            .select("id")
            .eq("receiver_id", receiverId)
            .eq("sender_id",sender_id)
            .eq("seen", false);

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!messages.length) {
            return NextResponse.json({ message: "No unread messages" }, { status: 200 });
        }

        // 4. Update all messages to `seen: true`
        const { error: updateError } = await supabase
            .from("messages")
            .update({ seen: true })
            .eq("receiver_id", receiverId)
            .eq("sender_id",sender_id)
            .eq("seen", false);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ message: "All messages marked as seen" }, { status: 200 });

    } catch (error) {
        console.error("Error marking messages as seen:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

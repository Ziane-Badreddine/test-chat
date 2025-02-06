// app/api/friends/requests/[id]/route.ts
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, props: { params: Promise<{ friendsId: string }> }) {
    {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
            // 1. Get current user's UUID
            const { data: currentUser, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("clerk_id", clerkId)
                .single();

            if (userError || !currentUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const { friendsId } = await props.params
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(friendsId)) {
                return NextResponse.json({ error: "Invalid friendship ID" }, { status: 400 });
            }


            // 3. Get existing friendship
            const { data: existingFriendship, error: fetchError } = await supabase
                .from("friends")
                .select("*")
                .eq("id", friendsId)
                .single();

            if (fetchError || !existingFriendship) {
                return NextResponse.json({ error: "Friendship not found" + friendsId }, { status: 404 });
            }

            // 4. Verify user authorization
            const isUserInvolved = [existingFriendship.user_id, existingFriendship.friend_id].includes(currentUser.id);
            if (!isUserInvolved) {
                return NextResponse.json({ error: "Unauthorized action" }, { status: 403 });
            }

            // 5. Get and validate new status
            const { status } = await req.json();
            if (!["accepted", "blocked", "pending"].includes(status)) {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            }


            const { data: updatedFriendship, error: updateError } = await supabase
                .from("friends")
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                    sender_id: currentUser.id
                })
                .eq("id", friendsId)
                .select(`
        id,
        status,
        created_at,
        updated_at,
        sender:sender_id(id,username,avatar_url),
        user:user_id(id,username,avatar_url),
        friend:friend_id(id,username,avatar_url)
      `)
                .single();

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

        } catch (error) {
            console.error("Friendship update error:", error);
            return NextResponse.json(
                { error: "Internal Server Error" },
                { status: 500 }
            );
        }
    }
}



export async function DELETE(req: NextRequest, props: { params: Promise<{ friendsId: string }> }) {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Récupérer l'UUID de l'utilisateur
        const { data: currentUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 2. Valider l'ID d'amitié
        const { friendsId } = await props.params;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(friendsId)) {
            return NextResponse.json({ error: "Invalid friendship ID format" }, { status: 400 });
        }

        // 3. Vérifier l'existence de la relation
        const { data: existingFriendship, error: fetchError } = await supabase
            .from("friends")
            .select("user_id, friend_id")
            .eq("id", friendsId)
            .single();

        if (fetchError?.code === 'PGRST116') {
            return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
        }

        if (fetchError) {
            console.error("Database error:", fetchError);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        // 4. Vérifier l'autorisation
        const isAuthorized = [existingFriendship.user_id, existingFriendship.friend_id].includes(currentUser.id);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized action" }, { status: 403 });
        }

        // 5. Supprimer la relation
        const { error: deleteError } = await supabase
            .from("friends")
            .delete()
            .eq("id", friendsId);

        if (deleteError) {
            console.error("Delete error:", deleteError);
            return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
        }

        return NextResponse.json(
            { message: "Friendship successfully deleted" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
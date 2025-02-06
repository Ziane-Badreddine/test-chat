// app/api/messages/[id]/route.ts
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, props: { params: Promise<{ messagesId: string }> }) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Valider l'ID du message
    const { messagesId } = await props.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messagesId)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    // 2. Récupérer l'utilisateur actuel
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Vérifier l'existence du message
    const { data: existingMessage, error: fetchError } = await supabase
      .from("messages")
      .select("sender_id, receiver_id")
      .eq("id", messagesId)
      .single();

    if (fetchError?.code === 'PGRST116') {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (fetchError) {
      console.error("Database error:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // 4. Vérifier les permissions
    const isAuthorized = [existingMessage.sender_id, existingMessage.receiver_id].includes(currentUser.id);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized action" }, { status: 403 });
    }

    // 5. Récupérer et valider les données de mise à jour
    const updateData = await req.json();
    const allowedUpdates = ['content', 'media_url', 'seen'];
    const updates = Object.keys(updateData);

    const isValidOperation = updates.every(update =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return NextResponse.json(
        { error: "Invalid updates! Allowed updates: content, media_url, seen" },
        { status: 400 }
      );
    }

    // 6. Appliquer les mises à jour
    const { data: updatedMessage, error: updateError } = await supabase
      .from("messages")
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq("id", messagesId)
      .select(`
        id,
        content,
        media_url,
        seen,
        created_at,
        updated_at,
        sender:sender_id(id,username,avatar_url),
        receiver:receiver_id(id,username,avatar_url)
      `)
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // 7. Formater la réponse
    const sender = updatedMessage?.sender?.[0] || null;
    const receiver = updatedMessage?.receiver?.[0] || null;

    const responseData = {
      ...updatedMessage,
      isSender: sender?.id === currentUser.id,
      interlocutor: sender?.id === currentUser.id ? receiver : sender
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
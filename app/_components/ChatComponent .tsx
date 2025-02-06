import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/clerk-react"; // Import Clerk's hook
import { useEffect } from "react";

const ChatComponent = () => {
  const { user, isLoaded, isSignedIn } = useUser(); // Clerk user hook

  // Once the user is signed in, set the auth token to Supabase
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.session?.access_token) {
      // Set the Clerk token in Supabase
      supabase.auth.setAuth(user.session.access_token);
      console.log("Auth token set for Supabase");
    }
  }, [isLoaded, isSignedIn, user]);

  const sendMessage = async () => {
    if (!user?.id) {
      console.error("User is not authenticated.");
      return;
    }

    // Send message
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, // Clerk user ID (string)
      content: "Your message",
    });

    if (error) {
      console.error("Error inserting message:", error.message);
    } else {
      console.log("Message sent successfully!");
    }
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};

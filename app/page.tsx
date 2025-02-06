"use client"
import { useUser } from "@clerk/nextjs";
import Chat from "./_components/Chat";
import { useEffect } from "react";
import axios from "axios";


export default  function ChatPage() {

  const { user } = useUser();

  useEffect(() => {
      if (!user) return;

      const createUser = async () => {
          try {
              const res = await axios.post("/api/users", {
                  username: user.username,
                  email: user.emailAddresses[0]?.emailAddress,
                  avatar_url: user.imageUrl,
              });

              if (res.status === 201) {
                  console.log("✅ User created successfully!");
              } 
          } catch (err) {
              console.error("❌ Error creating user:", err);
          }
      };

      createUser();
  }, [user]);



  return (
    <div className="flex justify-center items-center h-screen">
      <Chat />
    </div>
  );
}
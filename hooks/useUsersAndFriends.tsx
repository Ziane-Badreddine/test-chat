"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "@/lib/supabase";

export interface User {
    id: string;
    clerk_id: string;
    username: string;
    email: string;
    avatar_url: string;
    created_at: Date;
}

export interface FriendRequest {
    id: string;
    status: string;
    created_at: Date;
    isSender: boolean; 
    friend: User;
}

export const useUsersAndFriends = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [originalUsers, setOriginalUsers] = useState<User[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const [friendsReqeust, setfriendsReqeust] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);


    useEffect(() => {
        const fetchUsersAndFriends = async () => {
            setLoading(true);
            try {
                const [usersRes, friendsRes,messagesRes] = await Promise.all([
                    axios.get("/api/users"),
                    axios.get("/api/friends"),
                    axios.get("/api/messages"),
                ]);

                if (usersRes.status === 201) {
                    setUsers(usersRes.data);
                    setOriginalUsers(usersRes.data);
                    setMessages(messagesRes.data);
                }

                if (friendsRes.status === 200) {
                    setfriendsReqeust(friendsRes.data)
                    setFriends(friendsRes.data.map(({ friend, status,isSender }: { friend: User, status: string,isSender: boolean }) => {
                        return { isSender,status, ...friend }
                    }));
                }
            } catch (err) {
                setError("Erreur lors de la récupération des données.");
                console.error("Erreur :", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsersAndFriends();

        const messagesChannel = supabase
            .channel("messages-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
                fetchUsersAndFriends(); // Rafraîchit la liste des amis en temps réel
            })
            .subscribe();

        const friendsChannel = supabase
            .channel("friends-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, () => {
                fetchUsersAndFriends(); // Rafraîchit la liste des amis en temps réel
            })
            .subscribe();

        // ✅ Realtime Subscription for 'users' table
        const usersChannel = supabase
            .channel("users-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
                fetchUsersAndFriends(); // Rafraîchit la liste des utilisateurs en temps réel
            })
            .subscribe();

        return () => {
            supabase.removeChannel(friendsChannel);
            supabase.removeChannel(usersChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, []);

    return { users, setUsers, originalUsers, friends,friendsReqeust,messages, loading, error };
};

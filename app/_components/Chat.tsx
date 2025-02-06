"use client"

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Send, Search, CheckCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SearchInput, { User } from "./searchInput";
import { UserCard } from "./CardUser";
import { useUser } from "@clerk/nextjs";
import { AvatarImage } from "@radix-ui/react-avatar";
import axios from "axios";
import { useUsersAndFriends } from "@/hooks/useUsersAndFriends";

import { format, isToday, isYesterday } from "date-fns";






export default function ChatApp() {
    const [selectedChat, setSelectedChat] = useState<User>();

    const newMessage = useRef<HTMLInputElement>(null);

    const sendMessage = async () => {
        if (!newMessage.current?.value.trim()) return;
        try {
            const res = await axios.post("/api/messages", {
                content: newMessage.current?.value,
                receiver_id: selectedChat?.id,
                media_url: null
            })
            console.log(res);

        } catch (error) {
            console.log(error);
        } finally {
            newMessage.current.value = ""
        }

    };
    const { user } = useUser();


    const { users, setUsers, originalUsers, friendsReqeust, friends, messages } = useUsersAndFriends();

    console.log(messages)

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView();
    }, [selectedChat]);

    const handleSelect = async (item: any) => {
        setSelectedChat(item)
        try {
            const response = await axios.patch(`/api/messages`, {
                sender_id: item.id
            });
        } catch (error) {
            console.error(error)
        }

    }
    useEffect(() => {
        if (selectedChat) {
            const interval = setInterval(() => {
                handleSelect(selectedChat);
            }, 100000);

            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    const getMessageTime = (timestamp: any) => {
        const date = new Date(timestamp);
        if (isToday(date)) {
            return `Today ${format(date, "HH:mm")}`;
        } else if (isYesterday(date)) {
            return `Yesterday ${format(date, "HH:mm")}`;
        } else {
            return format(date, "dd/MM/yyyy HH:mm");
        }
    };







    return (
        <div className="flex h-screen w-screen">
            {/* Sidebar with Tabs */}
            <div className="w-1/4 border-r p-4 bg-gray-100 flex flex-col justify-between">
                <Tabs defaultValue="conversations">
                    <TabsList className="flex w-full mb-4">
                        <TabsTrigger value="conversations" className="flex-1">Conversations</TabsTrigger>
                        <TabsTrigger value="friendRequests" className="flex-1">Amis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="conversations">
                        <ScrollArea className="h-[70vh]">
                            {friends.filter((item) => item.status === "accepted").map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-3 cursor-pointer rounded-lg ${selectedChat?.id === item.id ? "bg-gray-300" : "hover:bg-gray-200"}`}
                                    onClick={() => handleSelect(item)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="w-12 h-12" >
                                            <AvatarImage src={item.avatar_url} alt="@user" />
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{item.username}</p>
                                            <p className="text-sm text-gray-600">{item.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="friendRequests">
                        <SearchInput users={users} setUsers={setUsers} friends={friends} originalUsers={originalUsers} />
                        <ScrollArea className="h-[70vh]">
                            <div className="flex flex-col items-center justify-center gap-2">
                                {friends.length > 0 && friendsReqeust !== undefined && friends.map((item, i) => {
                                    return <UserCard key={i} user={item} status={item.status} isSender={item.isSender} friendReqeust={friendsReqeust.find((value) => value.friend.id === item.id)} selectedChat={selectedChat} setSelectedChat={setSelectedChat} />
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                </Tabs>

                {/* Profile Section */}
                <div className="p-4 border-t flex items-center space-x-3 bg-white">
                    <Avatar className="w-12 h-12" >
                        <AvatarImage src={user?.imageUrl} alt="@user" />
                    </Avatar>
                    <div>
                        <p className="font-medium">Mon Profil</p>
                        <p className="text-sm text-gray-600">Voir et éditer</p>
                    </div>
                </div>
            </div>

            {/* Chat Window */}

            {selectedChat !== undefined && <div className="w-3/4 flex flex-col">
                <div className="p-4 border-b font-semibold text-lg bg-gray-50">{selectedChat?.username}</div>
                <ScrollArea className="flex-1 p-4 h-[70vh] w-full overflow-y-auto">
                    {messages.filter((msg) => msg.interlocutor.id === selectedChat.id).map((msg, index) => (
                        <div key={index} className={`flex mb-2 ${msg.isSender ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`relative max-w-xs px-4 py-2 text-sm rounded-lg shadow-md 
                                ${msg.isSender ? "bg-green-500 text-white rounded-br-none" : "bg-gray-200 text-black rounded-bl-none"}`}
                            >
                                <p>{msg.content}</p>
                                <div className="flex items-center justify-end text-xs opacity-80 mt-1">
                                    <span>{getMessageTime(msg.created_at)}</span>
                                    {msg.isSender && msg.seen && (
                                        <CheckCheck className="text-blue-500 w-4 h-4  ml-1" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </ScrollArea>

                <div className="p-4 border-t flex items-center gap-2 bg-white">  <Input
                    ref={newMessage}
                    placeholder="Écrire un message..."
                />
                    <Button onClick={sendMessage} className="bg-blue-500 hover:bg-blue-600">
                        <Send className="w-5 h-5" />
                    </Button>
                </div>


            </div>
            }
        </div>
    );
}

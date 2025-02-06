"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Blocks, Check, CheckCheck, CircleDashed, CircleEllipsis, EllipsisVertical, Menu, Trash2, UserCheck, X } from "lucide-react";
import { User } from "./searchInput";
import axios from "axios";
import { useState } from "react";
import * as React from "react"
import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation";


interface UserCardProps {
  user: User;
  status: string;
  isSender: boolean;
  friendReqeust: any;
  selectedChat: any;
  setSelectedChat: React.Dispatch<React.SetStateAction<User | undefined>>
}



export function UserCard({ user, status, isSender, friendReqeust,selectedChat,setSelectedChat }: UserCardProps) {




  const handleAccept = async () => {
    try {
      const response = await axios.patch(
        `/api/friends/${friendReqeust.id}`,
        { status: "accepted" }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data.error || "Update failed");
      }
      throw new Error("Unknown error");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `/api/friends/${friendReqeust.id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data.error || "Update failed");
      }
      throw new Error("Unknown error");
    }finally{
      setSelectedChat(undefined);
    }
  };

  const handleBlock = async () => {
    try {
      const response = await axios.patch(
        `/api/friends/${friendReqeust.id}`,
        { status: "blocked" }
      );
      return response.data;
    } catch (error) {
      throw new Error("Unknown error");
    }
  };





  return (
    <Card className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 w-full">
      <div className="flex items-center space-x-3">
        <Avatar className="w-12 h-12" >
          <AvatarImage src={user.avatar_url} alt="@user" />
        </Avatar>
        <div>
          <p className="font-medium">{user.username}</p>
          {status === "accepted" && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <UserCheck />
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {status === "pending" && !isSender && <Button size={"icon"} onClick={handleAccept}><Check /></Button>}
        {status === "pending" && !isSender && <Button size={"icon"} onClick={handleDelete} ><Trash2 /></Button>}
      </div>

      {status === "pending" && isSender && <Button disabled className="bg-blue-500 text-white px-3 py-1 rounded-lg"><CircleDashed /></Button>}
      {status === "accepted" && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={"icon"}><EllipsisVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent >
          <DropdownMenuItem>
            <button className="w-full flex items-center gap-2" onClick={handleBlock} >
              <X />
              Block
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <button className="w-full flex items-center gap-2" onClick={handleDelete} >
              <Trash2 />
              Delete
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      }


    </Card>
  );
}

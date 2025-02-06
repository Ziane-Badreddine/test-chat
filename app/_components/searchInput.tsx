"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogTitle } from '@radix-ui/react-dialog';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage } from '@radix-ui/react-avatar';
import { Loader2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUsersAndFriends } from '@/hooks/useUsersAndFriends';
import { redirect, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface User {
    id: string | '';
    clerk_id: string | '',
    username: string | '',
    email: string | '',
    avatar_url: string | '',
    created_at: Date
}

interface Props {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    originalUsers: User[];
    friends: User[];
}


const SearchInput = ({ users, setUsers, originalUsers, friends }: Props) => {


    const inputSearch = useRef<HTMLInputElement>(null);
    const { user } = useUser();
    const [isSumbmiting,setIsSumbmiting] = useState(false);
    const [id,setId] = useState("");

 



    const handlePost = async (id: string) => {
        setId(id);

        try {
            setIsSumbmiting(true);
            toast("friend reqeust sended...")
            const res = await axios.post("/api/friends", {
                friend_id: id
            });

            if (res.status === 201) {
                console.log("Ami ajouté :", res.data);
                toast.success("friend reqeust sended")
            }
        } catch (error) {
            toast.warning("something be wrong");
        }finally{
            setIsSumbmiting(false)
        }
    };

    const handleSearch = () => {
        if (inputSearch.current) {
            const searchValue = inputSearch.current.value.trim().toLowerCase();

            if (!searchValue) {
                setUsers(originalUsers);
                return;
            }

            const filteredUsers = originalUsers.filter(user =>
                user.username.toLowerCase().includes(searchValue)
            );

            setUsers(filteredUsers);

        }
    };


    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="w-full mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5" /> Rechercher un ami
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Rechercher un ami</DialogTitle>
                <Input placeholder="Entrez un nom..." ref={inputSearch} onChange={handleSearch} />
                <div className='mt-5 flex flex-col items-center justify-center gap-5 w-full'>
                    <ScrollArea className=" h-[500px] w-full rounded-md border ">
                        <div className='flex flex-col items-center justify-center gap-5'>
                            {users.length > 0 && users.filter((item) => {
                                return ((user?.id !== item.clerk_id) && !friends.map((item) => item.id).includes(item.id))
                            }).map((item, i) => {
                                return (<Card key={i} className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 w-full">
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="w-12 h-12" >
                                            <AvatarImage src={item.avatar_url} className='rounded-full' alt="@user" />
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{item.username}</p>
                                        </div>
                                    </div>
                                    <Button className='mr-5' onClick={() => handlePost(item.id)}>{ (isSumbmiting && id === item.id)  ? <Loader2 className='w-5 h-5 animate-spin' /> : <p>add</p>
                            }</Button>

                                </Card>)
                            })}
                        </div>
                    </ScrollArea>

                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SearchInput
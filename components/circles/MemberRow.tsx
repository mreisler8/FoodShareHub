
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Crown, Shield, UserMinus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Member {
  id: number;
  userId: number;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  user: {
    id: number;
    username: string;
    name: string;
    profilePicture?: string;
    bio?: string;
  };
}

interface MemberRowProps {
  member: Member;
  circleId: number;
  currentUserId: number;
  currentUserRole: "owner" | "admin" | "member";
}

export function MemberRow({ member, circleId, currentUserId, currentUserRole }: MemberRowProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const queryClient = useQueryClient();

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/members/${member.userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circleId}`] });
      
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRemoving(false);
    },
  });

  const handleRemove = async () => {
    setIsRemoving(true);
    removeMemberMutation.mutate();
  };

  const canRemove = currentUserRole === "owner" || 
    (currentUserRole === "admin" && member.role === "member") && 
    member.userId !== currentUserId;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Owner</Badge>;
      case "admin":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Admin</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.user.profilePicture} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{member.user.name}</span>
            <span className="text-sm text-muted-foreground">@{member.user.username}</span>
            {member.userId === currentUserId && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            {getRoleBadge(member.role)}
            <span className="text-xs text-muted-foreground">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {getRoleIcon(member.role)}
        
        {canRemove && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {member.user.name} from this circle? 
                  They will lose access to all circle content and will need to rejoin if invited again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRemoving ? "Removing..." : "Remove Member"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

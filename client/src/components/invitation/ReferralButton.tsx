import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { UserPlus, Share2, Users } from "lucide-react";
import { InviteModal } from "./InviteModal";

interface ReferralButtonProps extends Omit<ButtonProps, "onClick"> {
  circleId?: number;
  circleName?: string;
  userId: number;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  referralType?: "app" | "circle";
  className?: string;
  children?: React.ReactNode;
}

export function ReferralButton({
  circleId,
  circleName,
  userId,
  variant = "default",
  size = "default",
  referralType = "app",
  className = "",
  children,
  ...props
}: ReferralButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
        {...props}
      >
        {size === "icon" ? (
          referralType === "app" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />
        ) : children || (
          <>
            {referralType === "app" ? (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Friends
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Invite to Circle
              </>
            )}
          </>
        )}
      </Button>

      <InviteModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        circleId={circleId}
        circleName={circleName}
        userId={userId}
      />
    </>
  );
}
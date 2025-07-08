import { useEffect } from "react";
import { useLocation } from "wouter";
import { PostModal } from "@/components/post/PostModal";

export default function CreatePost() {
  const [, navigate] = useLocation();
  
  // Auto-redirect to home and open PostModal instead of using old form
  useEffect(() => {
    navigate("/");
  }, [navigate]);
  
  return (
    <PostModal 
      open={true} 
      onOpenChange={(open) => {
        if (!open) {
          navigate("/");
        }
      }} 
    />
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PostModal } from "@/components/post/PostModal";

export default function CreatePostPage() {
  const [, navigate] = useLocation();
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    // If modal is closed, navigate back
    if (!showModal) {
      navigate('/');
    }
  }, [showModal, navigate]);

  return (
    <PostModal
      open={showModal}
      onOpenChange={setShowModal}
    />
  );
}
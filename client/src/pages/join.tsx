import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle2, Users } from "lucide-react";
import { analytics } from "@/lib/analytics";

export default function JoinPage() {
  const [location, navigate] = useLocation();
  const [_, params] = useRoute("/join");
  const { toast } = useToast();
  
  // Parse query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const referrerId = searchParams.get("ref");
  const circleId = searchParams.get("circle");
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
  // Fetch referrer info
  const { data: referrer, isLoading: isLoadingReferrer } = useQuery({
    queryKey: [`/api/users/${referrerId}`],
    enabled: !!referrerId,
  });
  
  // Fetch circle info if circle ID is provided
  const { data: circle, isLoading: isLoadingCircle } = useQuery({
    queryKey: [`/api/circles/${circleId}`],
    enabled: !!circleId,
  });
  
  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("POST", "/api/register", userData);
    },
    onSuccess: async (response) => {
      // After successful registration
      if (circleId && referrerId) {
        // Join the circle automatically if circle ID was provided
        await joinCircleMutation.mutateAsync();
      } else {
        // Otherwise just go to home
        navigate("/");
        
        toast({
          title: "Welcome to Circles!",
          description: "Your account has been created successfully.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "There was a problem creating your account.",
        variant: "destructive",
      });
    }
  });
  
  // Join circle mutation
  const joinCircleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/circle-members", {
        circleId: Number(circleId),
        userId: 1, // This would be the newly created user ID in a real app
        joinedViaReferral: true,
        referrerId: Number(referrerId)
      });
    },
    onSuccess: () => {
      setIsJoining(false);
      
      toast({
        title: "Welcome to Circles!",
        description: `You've joined ${circle?.name || "the circle"} successfully.`,
      });
      
      // Track analytics for the referral conversion
      if (referrerId) {
        analytics.trackInvite(
          Number(referrerId), 
          circleId ? "circle" : "app", 
          "conversion", 
          circleId ? Number(circleId) : undefined
        );
      }
      
      navigate("/");
    },
    onError: (error) => {
      setIsJoining(false);
      
      toast({
        title: "Error joining circle",
        description: "Your account was created but we couldn't add you to the circle.",
        variant: "destructive",
      });
      
      navigate("/");
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    
    const userData = {
      username,
      email,
      password,
      name,
      ...(referrerId && { referrerId: Number(referrerId) })
    };
    
    registerMutation.mutate(userData);
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left side - Registration form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-primary">Join Circles</h2>
            {referrer && !isLoadingReferrer && (
              <p className="mt-2 text-neutral-600">
                <span className="font-medium">{referrer.name}</span> invited you to join
                {circleId && circle ? ` their "${circle.name}" circle` : ''}
              </p>
            )}
          </div>
          
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>
                  Connect with friends and discover trusted restaurant recommendations
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                {circle && !isLoadingCircle && (
                  <div className="bg-primary/10 p-3 rounded-md mt-4 flex items-start">
                    <Users className="text-primary h-5 w-5 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-primary">You'll join: {circle.name}</h4>
                      <p className="text-sm text-neutral-600">{circle.description}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registerMutation.isPending || isJoining}
                >
                  {(registerMutation.isPending || isJoining) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {circleId ? "Join Circle" : "Create Account"}
                </Button>
                
                <div className="mt-4 text-center text-sm text-neutral-500">
                  Already have an account?{" "}
                  <Link href="/auth">
                    <a className="font-medium text-primary hover:underline">
                      Sign in
                    </a>
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      
      {/* Right side - App information */}
      <div className="hidden lg:block relative w-0 flex-1 bg-gradient-to-br from-primary to-primary-foreground">
        <div className="absolute inset-0 flex flex-col justify-center items-center px-12 text-white">
          <h2 className="text-4xl font-bold mb-6">
            Discover restaurants through trusted connections
          </h2>
          <p className="text-xl mb-10 max-w-md text-center">
            Circles helps you find great restaurants based on recommendations from people you trust, not strangers on the internet.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-lg">
              <div className="flex items-center mb-3">
                <Users className="h-6 w-6 mr-2" />
                <h3 className="text-lg font-medium">Trusted Circles</h3>
              </div>
              <p className="text-sm">
                Join circles of friends and family who share your taste in food
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-lg">
              <div className="flex items-center mb-3">
                <CheckCircle2 className="h-6 w-6 mr-2" />
                <h3 className="text-lg font-medium">Quality Recommendations</h3>
              </div>
              <p className="text-sm">
                Discover restaurants recommended by people whose opinions you value
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
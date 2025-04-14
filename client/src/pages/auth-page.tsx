import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle2, LockKeyhole } from "lucide-react";
import { useAuth, loginSchema, registerSchema, LoginData, RegisterData } from "@/hooks/use-auth";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [_, navigate] = useLocation();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();

  // Redirect to home if already logged in
  if (user && !isLoading) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Auth form section */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm
                onSuccess={() => navigate("/")}
                onRegisterClick={() => setActiveTab("register")}
              />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm
                onSuccess={() => navigate("/")}
                onLoginClick={() => setActiveTab("login")}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero/promo section */}
      <div className="flex-1 bg-gradient-to-br from-primary/90 to-primary/60 p-8 flex flex-col justify-center text-white">
        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Find Your Next Favorite Restaurant</h1>
          <p className="text-xl mb-8">
            Join trusted circles of friends and discover the best dining experiences through recommendations you can actually trust. 
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <UserCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Join Trusted Circles</h3>
                <p>Connect with friends and trusted sources for authentic restaurant recommendations.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <LockKeyhole size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No More Anonymous Reviews</h3>
                <p>Build a network of trusted recommendations from people you actually know.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoginFormProps {
  onSuccess: () => void;
  onRegisterClick: () => void;
}

function LoginForm({ onRegisterClick }: LoginFormProps) {
  const { loginMutation } = useAuth();
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: LoginData) {
    loginMutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back!</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            <div className="text-center mt-4">
              <span className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={onRegisterClick}
                >
                  Register
                </Button>
              </span>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

interface RegisterFormProps {
  onSuccess: () => void;
  onLoginClick: () => void;
}

function RegisterForm({ onLoginClick }: RegisterFormProps) {
  const { registerMutation } = useAuth();
  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      bio: "",
      profilePicture: "",
    },
  });

  function onSubmit(data: RegisterData) {
    registerMutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Join our community of food enthusiasts</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Choose a username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Choose a password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Tell us about yourself" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="URL to your profile picture" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            <div className="text-center mt-4">
              <span className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={onLoginClick}
                >
                  Sign in
                </Button>
              </span>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
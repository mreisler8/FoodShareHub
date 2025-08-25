import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth, loginSchema, LoginData, RegisterData } from "@/hooks/use-auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Enhanced validation schemas
const loginFormSchema = z.object({
  username: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const registerFormSchema = z.object({
  username: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  name: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  password: z.string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      username: "",
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onLoginSubmit(values: LoginData) {
    loginMutation.mutate(values);
  }

  function onRegisterSubmit(values: RegisterFormValues) {
    // Extract only the data needed for registration, omitting confirmPassword
    const { confirmPassword, ...registrationData } = values;
    
    // Add empty bio and profilePicture to match the schema
    registerMutation.mutate({
      ...registrationData,
      bio: "",
      profilePicture: "",
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* App branding for mobile */}
          <div className="text-center mb-8 sm:hidden">
            <h1 className="text-2xl font-bold text-primary mb-2">Circles</h1>
            <p className="text-muted-foreground">Share food experiences with your circle</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8" role="tablist">
              <TabsTrigger value="login" role="tab" aria-selected={activeTab === "login"}>Sign In</TabsTrigger>
              <TabsTrigger value="register" role="tab" aria-selected={activeTab === "register"}>Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="your.email@example.com" 
                                autoComplete="email"
                                className="text-base sm:text-sm" // Better mobile experience
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                className="text-base sm:text-sm" // Better mobile experience
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full min-h-[44px] text-base sm:text-sm" // Better mobile touch targets
                        disabled={loginMutation.isPending}
                        aria-label="Sign in to your account"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" aria-hidden="true" />
                            Signing in...
                          </>
                        ) : (
                          "Sign in"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Join our community of food enthusiasts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="your.email@example.com" 
                                autoComplete="email"
                                className="text-base sm:text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
                                autoComplete="name"
                                className="text-base sm:text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a secure password (6+ characters)"
                                autoComplete="new-password"
                                className="text-base sm:text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Re-enter your password"
                                autoComplete="new-password"
                                className="text-base sm:text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full min-h-[44px] text-base sm:text-sm"
                        disabled={registerMutation.isPending}
                        aria-label="Create your account"
                      >
                        {registerMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" aria-hidden="true" />
                            Creating account...
                          </>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero/Branding */}
      <div className="hidden md:flex flex-1 bg-slate-50 dark:bg-slate-900 p-12 flex-col justify-center items-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Discover Trusted Dining Experiences
          </h1>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-8">
            Join Circles and connect with friends who share your taste in food. Discover restaurants through trusted recommendations, not anonymous reviews.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Trusted Circles</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Share recommendations with friends you trust
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Curated Lists</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create and share your favorite restaurant collections
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Location Discovery</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Find great spots wherever you go
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Mobile Friendly</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Access your circles on web and mobile
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
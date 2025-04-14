import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreatePost from "@/pages/create-post";
import CircleDetails from "@/pages/circle-details";
import Profile from "@/pages/profile";
import Discover from "@/pages/discover";
import DiscoverByLocation from "@/pages/discover-by-location";
import ListDetails from "@/pages/list-details";
import CreateList from "@/pages/create-list";
import PostDetails from "@/pages/post-details";
import JoinPage from "@/pages/join";
import AuthPage from "@/pages/auth";
import { AuthProvider } from "./hooks/use-auth";
import { useEffect } from "react";
import { addNativeAppClass } from "./lib/nativeAppBridge";

function Router() {
  // Add native app class to body for CSS targeting if running in native app
  useEffect(() => {
    addNativeAppClass();
  }, []);
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create-post" component={CreatePost} />
      <Route path="/circles/:id" component={CircleDetails} />
      <Route path="/profile/:id?" component={Profile} />
      <Route path="/discover" component={Discover} />
      <Route path="/discover-by-location" component={DiscoverByLocation} />
      <Route path="/lists/create" component={CreateList} />
      <Route path="/lists/:id" component={ListDetails} />
      <Route path="/posts/:id" component={PostDetails} />
      <Route path="/join" component={JoinPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

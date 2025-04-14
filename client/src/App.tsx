import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreatePost from "@/pages/create-post";
import HubDetails from "@/pages/hub-details";
import Profile from "@/pages/profile";
import Discover from "@/pages/discover";
import ListDetails from "@/pages/list-details";
import CreateList from "@/pages/create-list";
import PostDetails from "@/pages/post-details";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create-post" component={CreatePost} />
      <Route path="/circles/:id" component={HubDetails} />
      <Route path="/profile/:id?" component={Profile} />
      <Route path="/discover" component={Discover} />
      <Route path="/lists/create" component={CreateList} />
      <Route path="/lists/:id" component={ListDetails} />
      <Route path="/posts/:id" component={PostDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

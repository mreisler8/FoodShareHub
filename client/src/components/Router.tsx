import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { addNativeAppClass } from "../lib/nativeAppBridge";
import { ProtectedRoute } from "../lib/protected-route";
import NotFound from "../pages/not-found";
import Home from "../pages/home";
import CreatePost from "../pages/create-post";
import CircleDetails from "../pages/circle-details";
import Circles from "../pages/circles";
import Profile from "../pages/profile";
import Discover from "../pages/discover";
import DiscoverByLocation from "../pages/discover-by-location";
import ListDetails from "../pages/list-details";
import CreateList from "../pages/create-list";
import PostDetails from "../pages/post-details";
import JoinPage from "../pages/join";
import AuthPage from "../pages/auth-page";

function Router() {
  // Add native app class to body for CSS targeting if running in native app
  useEffect(() => {
    addNativeAppClass();
  }, []);
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/create-post" component={CreatePost} />
      <ProtectedRoute path="/circles" component={Circles} />
      <ProtectedRoute path="/circles/:id" component={CircleDetails} />
      <ProtectedRoute path="/profile/:id?" component={Profile} />
      <ProtectedRoute path="/discover" component={Discover} />
      <ProtectedRoute path="/discover-by-location" component={DiscoverByLocation} />
      <ProtectedRoute path="/lists/create" component={CreateList} />
      <ProtectedRoute path="/lists/:id" component={ListDetails} />
      <ProtectedRoute path="/posts/:id" component={PostDetails} />
      <ProtectedRoute path="/join" component={JoinPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default Router;
// Adding the settings route to the router using lazy loading for the settings page.
import { Switch, Route } from "wouter";
import { useEffect, lazy } from "react";
import { addNativeAppClass } from "../lib/nativeAppBridge";
import { ProtectedRoute } from "../lib/protected-route";
import NotFound from "../pages/not-found";
import Home from "../pages/home";
import CreatePost from "../pages/create-post";
import FeedPage from "../pages/feed";
import TopPicksPage from "../pages/top-picks";
import CircleDetails from "../pages/circle-details";
import Circles from "../pages/circles";
import CircleMembers from "../pages/circle-members";
import Profile from "../pages/profile";
import Settings from "../pages/settings";
import Discover from "../pages/discover";
import DiscoverByLocation from "../pages/discover-by-location";
import ListDetails from "../pages/list-details";
import CreateList from "../pages/create-list";
import CreateCircle from "../pages/create-circle";
import PostDetails from "../pages/post-details";
import JoinPage from "../pages/join";
import JoinCirclePage from "../pages/join/[inviteCode]";
import AuthPage from "../pages/auth-page";
import Lists from "./Lists";
import RestaurantDetailPage from "../pages/RestaurantDetailPage";
import UserDiscovery from "../pages/user-discovery";

function Router() {
  // Add native app class to body for CSS targeting if running in native app
  useEffect(() => {
    addNativeAppClass();
  }, []);

  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/feed" component={() => <FeedPage scope="feed" />} />
      <ProtectedRoute path="/feed/circle/:circleId" component={({ params }: any) => <FeedPage scope="circle" circleId={params?.circleId} />} />
      <ProtectedRoute path="/top-picks" component={TopPicksPage} />
      <ProtectedRoute path="/create-post" component={CreatePost} />
      <ProtectedRoute path="/circles" component={Circles} />
      <ProtectedRoute path="/create-circle" component={CreateCircle} />
      <ProtectedRoute path="/circles/:id" component={CircleDetails} />
      <ProtectedRoute path="/circles/:id/members" component={CircleMembers} />
      <ProtectedRoute path="/profile/:id?" component={Profile} />
      <ProtectedRoute path="/discover" component={Discover} />
      <ProtectedRoute path="/discover-by-location" component={DiscoverByLocation} />
      <ProtectedRoute path="/lists" component={Lists} />
      <ProtectedRoute path="/lists/create" component={CreateList} />
      <ProtectedRoute path="/lists/:id" component={ListDetails} />
      <ProtectedRoute path="/posts/:id" component={PostDetails} />
      <ProtectedRoute path="/join" component={JoinPage} />
      <ProtectedRoute path="/join/:inviteCode" component={JoinCirclePage} />
      <ProtectedRoute path="/restaurants/:id" component={RestaurantDetailPage} />
      <ProtectedRoute path="/user-discovery" component={UserDiscovery} />
      <Route path="/discover-by-location" component={DiscoverByLocation} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default Router;
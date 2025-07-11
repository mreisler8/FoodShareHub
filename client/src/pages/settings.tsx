
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  User,
  Shield,
  Bell,
  Users,
  Download,
  Trash2,
  Camera,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Smartphone,
  Mail,
  Key,
  AlertTriangle,
  Check,
  X,
  Settings as SettingsIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || "",
    username: currentUser?.username || "",
    bio: currentUser?.bio || "",
    preferredLocation: currentUser?.preferredLocation || "",
    website: "",
    preferredCuisines: currentUser?.preferredCuisines || [],
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public", // public, circles, private
    defaultPostVisibility: "followers",
    showFollowersCount: true,
    showFollowingCount: true,
    allowCircleInvites: true,
    allowDirectMessages: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newFollower: true,
    circleInvite: true,
    postReply: true,
    mentions: true,
    listShared: true,
    weeklyDigest: true,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/users/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update privacy settings mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/users/privacy`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Privacy settings updated",
        description: "Your privacy settings have been updated.",
      });
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/users/notifications`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been updated.",
      });
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handlePrivacySave = () => {
    updatePrivacyMutation.mutate(privacySettings);
  };

  const handleNotificationsSave = () => {
    updateNotificationsMutation.mutate(notificationSettings);
  };

  const SettingsNav = () => (
    <div className="w-full md:w-64 mb-6 md:mb-0">
      <div className="md:sticky md:top-6">
        <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex md:flex-col h-auto md:h-auto w-full justify-start bg-gray-50 p-1 rounded-lg">
            <TabsTrigger 
              value="profile" 
              className="w-full justify-start py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4 mr-3" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="privacy" 
              className="w-full justify-start py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Shield className="h-4 w-4 mr-3" />
              <span className="hidden md:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="w-full justify-start py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Bell className="h-4 w-4 mr-3" />
              <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="connections" 
              className="w-full justify-start py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 mr-3" />
              <span className="hidden md:inline">Connections</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="w-full justify-start py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Key className="h-4 w-4 mr-3" />
              <span className="hidden md:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="w-full justify-start py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Download className="h-4 w-4 mr-3" />
              <span className="hidden md:inline">Data</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  const ProfileSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={currentUser?.profilePicture} />
              <AvatarFallback className="text-xl">
                {currentUser?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">@</span>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                  className="pl-8"
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell people about yourself..."
              rows={3}
              maxLength={150}
            />
            <p className="text-sm text-gray-500">
              {profileData.bio.length}/150 characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profileData.preferredLocation}
                onChange={(e) => setProfileData(prev => ({ ...prev, preferredLocation: e.target.value }))}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profileData.website}
                onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          {/* Cuisine Preferences */}
          <div className="space-y-3">
            <Label>Favorite Cuisines</Label>
            <div className="flex flex-wrap gap-2">
              {["Italian", "Japanese", "Mexican", "Thai", "Indian", "French", "American", "Chinese"].map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant={profileData.preferredCuisines.includes(cuisine) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newCuisines = profileData.preferredCuisines.includes(cuisine)
                      ? profileData.preferredCuisines.filter(c => c !== cuisine)
                      : [...profileData.preferredCuisines, cuisine];
                    setProfileData(prev => ({ ...prev, preferredCuisines: newCuisines }));
                  }}
                >
                  {cuisine}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={handleProfileSave} disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const PrivacySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Visibility */}
          <div>
            <Label className="text-base font-medium">Profile Visibility</Label>
            <p className="text-sm text-gray-500 mb-3">Control who can see your profile</p>
            <div className="space-y-3">
              {[
                { value: "public", icon: Globe, label: "Public", desc: "Anyone can see your profile" },
                { value: "circles", icon: Users, label: "Circles Only", desc: "Only members of your circles can see your profile" },
                { value: "private", icon: Lock, label: "Private", desc: "Only you can see your profile" },
              ].map(({ value, icon: Icon, label, desc }) => (
                <div 
                  key={value}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer ${
                    privacySettings.profileVisibility === value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPrivacySettings(prev => ({ ...prev, profileVisibility: value }))}
                >
                  <Icon className="h-5 w-5 text-gray-500" />
                  <div className="flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-gray-500">{desc}</div>
                  </div>
                  {privacySettings.profileVisibility === value && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Default Post Visibility */}
          <div>
            <Label className="text-base font-medium">Default Post Visibility</Label>
            <p className="text-sm text-gray-500 mb-3">Choose who can see your posts by default</p>
            <div className="space-y-3">
              {[
                { value: "public", label: "Public", desc: "Anyone can see your posts" },
                { value: "followers", label: "Followers", desc: "Only your followers can see your posts" },
                { value: "circles", label: "Circles", desc: "Only members of your circles can see your posts" },
              ].map(({ value, label, desc }) => (
                <div 
                  key={value}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer ${
                    privacySettings.defaultPostVisibility === value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPrivacySettings(prev => ({ ...prev, defaultPostVisibility: value }))}
                >
                  <div className="flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-gray-500">{desc}</div>
                  </div>
                  {privacySettings.defaultPostVisibility === value && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Social Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Social Settings</Label>
            
            {[
              {
                key: "showFollowersCount",
                label: "Show Followers Count",
                desc: "Display your follower count on your profile",
              },
              {
                key: "showFollowingCount",
                label: "Show Following Count",
                desc: "Display your following count on your profile",
              },
              {
                key: "allowCircleInvites",
                label: "Allow Circle Invites",
                desc: "Let others invite you to their circles",
              },
              {
                key: "allowDirectMessages",
                label: "Allow Direct Messages",
                desc: "Let others send you direct messages",
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">{label}</Label>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
                <Switch
                  checked={privacySettings[key as keyof typeof privacySettings] as boolean}
                  onCheckedChange={(checked) => 
                    setPrivacySettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <Button onClick={handlePrivacySave} disabled={updatePrivacyMutation.isPending}>
            {updatePrivacyMutation.isPending ? "Saving..." : "Save Privacy Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Global Settings</Label>
            
            {[
              {
                key: "emailNotifications",
                label: "Email Notifications",
                desc: "Receive notifications via email",
                icon: Mail,
              },
              {
                key: "pushNotifications",
                label: "Push Notifications",
                desc: "Receive push notifications on your device",
                icon: Smartphone,
              },
            ].map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="font-medium">{label}</Label>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Activity Notifications */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Activity Notifications</Label>
            
            {[
              {
                key: "newFollower",
                label: "New Followers",
                desc: "When someone follows you",
              },
              {
                key: "circleInvite",
                label: "Circle Invites",
                desc: "When someone invites you to a circle",
              },
              {
                key: "postReply",
                label: "Post Replies",
                desc: "When someone comments on your posts",
              },
              {
                key: "mentions",
                label: "Mentions",
                desc: "When someone mentions you in a post or comment",
              },
              {
                key: "listShared",
                label: "List Shares",
                desc: "When someone shares your list",
              },
              {
                key: "weeklyDigest",
                label: "Weekly Digest",
                desc: "Weekly summary of activity in your circles",
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">{label}</Label>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
                <Switch
                  checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, [key]: checked }))
                  }
                  disabled={!notificationSettings.emailNotifications && !notificationSettings.pushNotifications}
                />
              </div>
            ))}
          </div>

          <Button onClick={handleNotificationsSave} disabled={updateNotificationsMutation.isPending}>
            {updateNotificationsMutation.isPending ? "Saving..." : "Save Notification Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const SecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Account Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Password</Label>
                <p className="text-sm text-gray-500">Last changed 3 months ago</p>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500">Add an extra layer of security</p>
              </div>
              <Button variant="outline">Enable 2FA</Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Login Sessions</Label>
                <p className="text-sm text-gray-500">Manage your active sessions</p>
              </div>
              <Button variant="outline">View Sessions</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DataSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Download Your Data</Label>
                <p className="text-sm text-gray-500">Export all your data in JSON format</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <Label className="font-medium text-red-600">Delete Account</Label>
                <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      <MobileNavigation />
      <DesktopSidebar />
      
      <div className="flex-1 max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/profile" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Profile
          </Link>
          <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg p-6 mb-4 overflow-hidden">
            {/* Fun Food Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-2 left-4 text-2xl opacity-15 rotate-12">🍕</div>
              <div className="absolute top-3 right-8 text-xl opacity-10 -rotate-6">🍔</div>
              <div className="absolute bottom-2 left-8 text-xl opacity-15 rotate-45">🍜</div>
              <div className="absolute bottom-1 right-4 text-2xl opacity-10 -rotate-12">🍝</div>
              <div className="absolute top-4 left-1/3 text-lg opacity-8 rotate-6">🌮</div>
              <div className="absolute bottom-3 right-1/3 text-lg opacity-12 -rotate-12">🍱</div>
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <SettingsIcon className="h-8 w-8" />
                Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your account preferences and privacy settings</p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex flex-col md:flex-row gap-6">
          <SettingsNav />
          
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="profile">
                <ProfileSettings />
              </TabsContent>
              
              <TabsContent value="privacy">
                <PrivacySettings />
              </TabsContent>
              
              <TabsContent value="notifications">
                <NotificationSettings />
              </TabsContent>
              
              <TabsContent value="connections">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Management</h3>
                  <p className="text-gray-500">Manage your followers, following, and blocked users.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="security">
                <SecuritySettings />
              </TabsContent>
              
              <TabsContent value="data">
                <DataSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

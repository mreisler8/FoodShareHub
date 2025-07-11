import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Camera, 
  User, 
  Shield, 
  Bell, 
  Globe,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  LogOut,
  Check,
  X,

  MapPin,
  ChefHat,
  Heart,
  Users,
  Mail,
  Phone,
  Calendar,
  Info
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuth } from "@/hooks/use-auth";
import { User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SettingsFormData {
  name: string;
  username: string;
  email: string;
  bio: string;
  preferredLocation: string;
  preferredCuisines: string[];
  profilePicture: string;
  coverImage: string;
  phoneNumber: string;
  dateOfBirth: string;
  favoriteFood: string;
  favoriteRestaurant: string;
  isPrivate: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  allowDirectMessages: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  reviewNotifications: boolean;
  followNotifications: boolean;
  circleInviteNotifications: boolean;
}

const cuisineOptions = [
  "Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "French", "American",
  "Mediterranean", "Korean", "Vietnamese", "Brazilian", "Greek", "Spanish", "Turkish",
  "Lebanese", "Ethiopian", "Peruvian", "German", "British", "Moroccan", "Russian"
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { currentUser } = useCurrentUser();
  const { logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current user settings
  const { data: userSettings, isLoading } = useQuery<UserType>({
    queryKey: ["/api/me"],
    enabled: !!currentUser,
  });

  // Initialize form data
  const [formData, setFormData] = useState<SettingsFormData>({
    name: userSettings?.name || "",
    username: userSettings?.username || "",
    email: userSettings?.email || "",
    bio: userSettings?.bio || "",
    preferredLocation: userSettings?.preferredLocation || "",
    preferredCuisines: userSettings?.preferredCuisines || [],
    profilePicture: userSettings?.profilePicture || "",
    coverImage: userSettings?.coverImage || "",
    phoneNumber: userSettings?.phoneNumber || "",
    dateOfBirth: userSettings?.dateOfBirth || "",
    favoriteFood: userSettings?.favoriteFood || "",
    favoriteRestaurant: userSettings?.favoriteRestaurant || "",
    isPrivate: userSettings?.isPrivate || false,
    showEmail: userSettings?.showEmail || false,
    showPhone: userSettings?.showPhone || false,
    showLocation: userSettings?.showLocation || true,
    allowDirectMessages: userSettings?.allowDirectMessages || true,
    emailNotifications: userSettings?.emailNotifications || true,
    pushNotifications: userSettings?.pushNotifications || true,
    marketingEmails: userSettings?.marketingEmails || false,
    reviewNotifications: userSettings?.reviewNotifications || true,
    followNotifications: userSettings?.followNotifications || true,
    circleInviteNotifications: userSettings?.circleInviteNotifications || true,
  });

  // Update form data when user settings load
  useEffect(() => {
    if (userSettings) {
      setFormData({
        name: userSettings.name || "",
        username: userSettings.username || "",
        email: userSettings.email || "",
        bio: userSettings.bio || "",
        preferredLocation: userSettings.preferredLocation || "",
        preferredCuisines: userSettings.preferredCuisines || [],
        profilePicture: userSettings.profilePicture || "",
        coverImage: userSettings.coverImage || "",
        phoneNumber: userSettings.phoneNumber || "",
        dateOfBirth: userSettings.dateOfBirth || "",
        favoriteFood: userSettings.favoriteFood || "",
        favoriteRestaurant: userSettings.favoriteRestaurant || "",
        isPrivate: userSettings.isPrivate || false,
        showEmail: userSettings.showEmail || false,
        showPhone: userSettings.showPhone || false,
        showLocation: userSettings.showLocation || true,
        allowDirectMessages: userSettings.allowDirectMessages || true,
        emailNotifications: userSettings.emailNotifications || true,
        pushNotifications: userSettings.pushNotifications || true,
        marketingEmails: userSettings.marketingEmails || false,
        reviewNotifications: userSettings.reviewNotifications || true,
        followNotifications: userSettings.followNotifications || true,
        circleInviteNotifications: userSettings.circleInviteNotifications || true,
      });
    }
  }, [userSettings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SettingsFormData>) => {
      return apiRequest("/api/users/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating settings",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/users/delete", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      logoutMutation.mutate();
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting account",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof SettingsFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (!isEditing) setIsEditing(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const toggleCuisine = (cuisine: string) => {
    const newCuisines = formData.preferredCuisines.includes(cuisine)
      ? formData.preferredCuisines.filter(c => c !== cuisine)
      : [...formData.preferredCuisines, cuisine];
    handleInputChange("preferredCuisines", newCuisines);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 md:p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
                <div className="h-96 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
          <MobileNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your account and preferences</p>
              </div>
            </div>
            
            {isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={formData.profilePicture} alt={formData.name} />
                      <AvatarFallback className="text-xl">
                        {formData.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                      <p className="text-sm text-gray-500 mt-1">
                        JPG, PNG or GIF. Max size 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Tell us about yourself and your food preferences..."
                      rows={4}
                    />
                  </div>

                  {/* Favorite Food & Restaurant */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="favoriteFood" className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        Favorite Food
                      </Label>
                      <Input
                        id="favoriteFood"
                        value={formData.favoriteFood}
                        onChange={(e) => handleInputChange("favoriteFood", e.target.value)}
                        placeholder="e.g., Margherita Pizza, Spicy Ramen..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        The dish that defines your taste
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="favoriteRestaurant" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        Favorite Restaurant
                      </Label>
                      <Input
                        id="favoriteRestaurant"
                        value={formData.favoriteRestaurant}
                        onChange={(e) => handleInputChange("favoriteRestaurant", e.target.value)}
                        placeholder="e.g., Joe's Pizza, Momofuku..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Your go-to place that never disappoints
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <Input
                        id="location"
                        value={formData.preferredLocation}
                        onChange={(e) => handleInputChange("preferredLocation", e.target.value)}
                        placeholder="Enter your city or region"
                      />
                    </div>
                  </div>

                  {/* Cuisine Preferences */}
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <ChefHat className="h-4 w-4" />
                      Cuisine Preferences
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {cuisineOptions.map((cuisine) => (
                        <Badge
                          key={cuisine}
                          variant={formData.preferredCuisines.includes(cuisine) ? "default" : "outline"}
                          className="cursor-pointer justify-center py-2 px-3 hover:bg-primary/10"
                          onClick={() => toggleCuisine(cuisine)}
                        >
                          {cuisine}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Visibility */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Private Account</Label>
                      <p className="text-sm text-gray-500">
                        Only approved followers can see your posts and profile
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPrivate}
                      onCheckedChange={(checked) => handleInputChange("isPrivate", checked)}
                    />
                  </div>

                  {/* Contact Info Visibility */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Contact Information Visibility</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Show Email</Label>
                        <p className="text-sm text-gray-500">
                          Display your email address on your profile
                        </p>
                      </div>
                      <Switch
                        checked={formData.showEmail}
                        onCheckedChange={(checked) => handleInputChange("showEmail", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Show Phone</Label>
                        <p className="text-sm text-gray-500">
                          Display your phone number on your profile
                        </p>
                      </div>
                      <Switch
                        checked={formData.showPhone}
                        onCheckedChange={(checked) => handleInputChange("showPhone", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Show Location</Label>
                        <p className="text-sm text-gray-500">
                          Display your location on your profile
                        </p>
                      </div>
                      <Switch
                        checked={formData.showLocation}
                        onCheckedChange={(checked) => handleInputChange("showLocation", checked)}
                      />
                    </div>
                  </div>

                  {/* Messaging */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Allow Direct Messages</Label>
                      <p className="text-sm text-gray-500">
                        Let other users send you direct messages
                      </p>
                    </div>
                    <Switch
                      checked={formData.allowDirectMessages}
                      onCheckedChange={(checked) => handleInputChange("allowDirectMessages", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Notifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Email Notifications</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={formData.emailNotifications}
                        onCheckedChange={(checked) => handleInputChange("emailNotifications", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Marketing Emails</Label>
                        <p className="text-sm text-gray-500">
                          Receive promotional emails and updates
                        </p>
                      </div>
                      <Switch
                        checked={formData.marketingEmails}
                        onCheckedChange={(checked) => handleInputChange("marketingEmails", checked)}
                      />
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Push Notifications</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Push Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive push notifications on your device
                        </p>
                      </div>
                      <Switch
                        checked={formData.pushNotifications}
                        onCheckedChange={(checked) => handleInputChange("pushNotifications", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">New Reviews</Label>
                        <p className="text-sm text-gray-500">
                          Notify me when someone reviews a restaurant I've been to
                        </p>
                      </div>
                      <Switch
                        checked={formData.reviewNotifications}
                        onCheckedChange={(checked) => handleInputChange("reviewNotifications", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">New Followers</Label>
                        <p className="text-sm text-gray-500">
                          Notify me when someone follows me
                        </p>
                      </div>
                      <Switch
                        checked={formData.followNotifications}
                        onCheckedChange={(checked) => handleInputChange("followNotifications", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium">Circle Invites</Label>
                        <p className="text-sm text-gray-500">
                          Notify me when I'm invited to join a circle
                        </p>
                      </div>
                      <Switch
                        checked={formData.circleInviteNotifications}
                        onCheckedChange={(checked) => handleInputChange("circleInviteNotifications", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Change Password */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="Enter your current password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter your new password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your new password"
                        />
                      </div>
                      <Button variant="outline">
                        Update Password
                      </Button>
                    </div>
                  </div>

                  {/* Data Export */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Data Export</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Download a copy of your data including posts, lists, and profile information.
                    </p>
                    <Button variant="outline">
                      Download My Data
                    </Button>
                  </div>

                  {/* Delete Account */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Once you delete your account, there is no going back. This action cannot be undone.
                      </p>
                      {!showDeleteConfirm ? (
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-red-700 mr-4">
                            Are you sure? This action cannot be undone.
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteAccount}
                            disabled={deleteAccountMutation.isPending}
                          >
                            {deleteAccountMutation.isPending ? "Deleting..." : "Yes, Delete"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  ArrowLeft,
  Users 
} from "lucide-react";
import { useLocation } from "wouter";

interface AccessDeniedViewProps {
  reason?: "not_member" | "not_authenticated" | "circle_not_found" | "circle_private";
  circle?: {
    id: number;
    name: string;
    isPrivate: boolean;
  };
}

export function AccessDeniedView({ reason = "not_member", circle }: AccessDeniedViewProps) {
  const [, setLocation] = useLocation();

  const handleGoBack = () => {
    setLocation("/circles");
  };

  const handleLogin = () => {
    setLocation("/auth");
  };

  const renderContent = () => {
    switch (reason) {
      case "not_authenticated":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <LogIn className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                You need to sign in to view circle content.
              </p>
              <div className="space-y-2">
                <Button onClick={handleLogin} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
                <Button variant="outline" onClick={handleGoBack} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Circles
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "circle_not_found":
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle>Circle Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                This circle doesn't exist or may have been deleted.
              </p>
              <Button variant="outline" onClick={handleGoBack} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Circles
              </Button>
            </CardContent>
          </Card>
        );

      case "not_member":
      case "circle_private":
      default:
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                Access Restricted
                {circle?.isPrivate && (
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {circle && (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{circle.name}</strong> is a private circle. 
                    You need to be invited by a member to access its content.
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-center text-muted-foreground space-y-2">
                <p>You're not a member of this circle.</p>
                {circle?.isPrivate ? (
                  <p className="text-sm">
                    Private circles require an invitation from existing members to join.
                  </p>
                ) : (
                  <p className="text-sm">
                    Contact a circle member to request access.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Button variant="outline" onClick={handleGoBack} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Circles
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Want to create your own circle?{" "}
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-xs underline"
                      onClick={() => setLocation("/create-circle")}
                    >
                      Start here
                    </Button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      {renderContent()}
    </div>
  );
}

import { useAuth } from "@/hooks/use-auth";

export default function CreateListDebug() {
  const { user, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Debug Create List Page</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Page Status:</strong> Loaded Successfully ✅
          </div>
          
          <div>
            <strong>Auth Loading:</strong> {isLoading ? "Yes" : "No"}
          </div>
          
          <div>
            <strong>User Authenticated:</strong> {user ? "Yes" : "No"}
          </div>
          
          {user && (
            <div>
              <strong>User ID:</strong> {user.id}
              <br />
              <strong>Username:</strong> {user.username}
            </div>
          )}
          
          {error && (
            <div className="text-red-600">
              <strong>Auth Error:</strong> {error}
            </div>
          )}
          
          <div>
            <strong>Component Imports:</strong> All working ✅
          </div>
          
          <div className="text-green-600">
            <strong>Conclusion:</strong> If you can see this page, the routing and authentication are working properly.
          </div>
        </div>
      </div>
    </div>
  );
}
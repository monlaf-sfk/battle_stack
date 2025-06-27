import { ShieldX, ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import { Card } from "./Card";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  showContactInfo?: boolean;
}

export function AccessDenied({ 
  title = "Access Denied",
  message = "You don't have permission to access this resource.",
  requiredRole,
  showContactInfo = true 
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <ShieldX size={64} className="text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
        
        <p className="text-gray-400 mb-6">{message}</p>
        
        {requiredRole && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300">
              <span className="text-white font-medium">Required Role:</span> {requiredRole}
            </p>
          </div>
        )}
        
        {showContactInfo && (
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail size={16} className="text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">Need Access?</span>
            </div>
            <p className="text-xs text-gray-300">
              Contact your administrator to request elevated permissions for your account.
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/dashboard" className="flex-1">
            <Button variant="secondary" className="w-full">
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link to="/support" className="flex-1">
            <Button variant="primary" className="w-full">
              <Mail size={16} className="mr-2" />
              Contact Support
            </Button>
          </Link>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </Card>
    </div>
  );
} 
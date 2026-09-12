import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--background)" }}>
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 backdrop-blur-sm" style={{ background: "color-mix(in oklch, var(--card) 80%, transparent)" }}>
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: "color-mix(in oklch, var(--destructive) 10%, transparent)" }} />
              <AlertCircle className="relative h-16 w-16" style={{ color: "var(--destructive)" }} />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--foreground)" }}>404</h1>

          <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Page Not Found
          </h2>

          <p className="mb-8 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

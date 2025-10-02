import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Heart, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock auth - in real app, this would connect to backend
    localStorage.setItem("tagmate_user", JSON.stringify({ username }));
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-primary opacity-80" />
      </div>

      <Card className="w-full max-w-md p-8 backdrop-blur-xl bg-[var(--glass-bg)] border-[var(--glass-border)] relative z-10 animate-scale-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-10 h-10 text-accent animate-bounce-subtle" fill="currentColor" />
            <h1 className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">
              TagMate
            </h1>
            <Sparkles className="w-8 h-8 text-secondary animate-bounce-subtle" />
          </div>
          <p className="text-muted-foreground">
            {isLogin ? "Welcome back!" : "Join your friends"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 rounded-xl border-2 focus:border-primary transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-2 focus:border-primary transition-all"
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Age"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-all"
                  min="13"
                  max="19"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Interests (e.g., music, sports, gaming)"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-all"
                />
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-gradient-primary hover:shadow-glow-primary transition-all font-semibold text-lg"
          >
            {isLogin ? "Log In" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="font-semibold text-primary">
              {isLogin ? "Sign Up" : "Log In"}
            </span>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;

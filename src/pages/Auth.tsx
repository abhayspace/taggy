import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, Upload, Heart, Star, Sparkles } from "lucide-react";
import authHero from "@/assets/auth-hero-3d.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/feed");
      }
    };
    checkUser();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@tagmate.app`,
        password,
      });

      if (error) throw error;

      toast({
        title: "✨ Welcome back!",
        description: "You've successfully logged in.",
      });

      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: `${username}@tagmate.app`,
        password,
        options: {
          data: {
            username,
            bio,
            age: age ? parseInt(age) : null,
            interests: interests.join(","),
          },
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });

      if (error) throw error;

      toast({
        title: "🎉 Account created!",
        description: "Welcome to TagMate!",
      });

      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-rainbow">
      {/* Floating Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 opacity-30 animate-bounce-subtle">
        <Heart className="w-full h-full text-primary floating-hearts" fill="currentColor" />
      </div>
      <div className="absolute top-40 right-20 w-16 h-16 opacity-30">
        <Star className="w-full h-full text-accent floating-stars" fill="currentColor" />
      </div>
      <div className="absolute bottom-32 left-20 w-24 h-24 opacity-20">
        <Sparkles className="w-full h-full text-secondary floating-hearts" />
      </div>
      <div className="absolute bottom-20 right-16 w-20 h-20 opacity-25">
        <Heart className="w-full h-full text-accent floating-stars" fill="currentColor" />
      </div>
      <div className="absolute top-1/2 left-1/4 w-12 h-12 opacity-20">
        <Star className="w-full h-full text-primary" fill="currentColor" />
      </div>
      
      {/* Hero Image Section - Desktop Only */}
      <div className="hidden lg:block absolute left-20 top-1/2 -translate-y-1/2 w-[500px] animate-fade-in">
        <img 
          src={authHero} 
          alt="Teen Social" 
          className="w-full h-auto rounded-3xl shadow-glow-rainbow card-3d"
        />
      </div>
      
      {/* Auth Card */}
      <Card className="relative z-10 w-full max-w-md p-8 glass-effect animate-scale-in card-3d border-4 border-primary/30 lg:ml-auto lg:mr-32 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Heart className="w-10 h-10 text-primary animate-bounce-subtle" fill="currentColor" />
            <h1 className="text-6xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">
              TagMate
            </h1>
            <Star className="w-10 h-10 text-accent animate-bounce-subtle" fill="currentColor" />
          </div>
          <p className="text-card-foreground font-bold text-xl">
            {isLogin ? "✨ Welcome back! Let's connect ✨" : "🎉 Join the fun community! 🎉"}
          </p>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Choose a cool username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-14 rounded-3xl border-3 border-primary/40 focus:border-primary transition-all shadow-glow-primary text-lg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-bold text-lg flex items-center gap-2">
              <Star className="w-4 h-4 text-secondary" fill="currentColor" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-3xl border-3 border-secondary/40 focus:border-secondary transition-all shadow-glow-secondary text-lg"
              minLength={6}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label className="text-foreground font-bold text-lg flex items-center gap-2">
                  <Heart className="w-4 h-4 text-accent" fill="currentColor" />
                  Profile Picture (Optional)
                </Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-24 h-24 border-4 border-accent/40">
                    {previewUrl ? (
                      <AvatarImage src={previewUrl} />
                    ) : (
                      <AvatarFallback className="bg-gradient-accent">
                        <Upload className="w-10 h-10" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label htmlFor="profile-pic" className="cursor-pointer">
                    <div className="px-6 py-3 bg-gradient-accent rounded-3xl text-base font-bold hover:scale-105 transition-all shadow-glow-accent">
                      Choose Photo
                    </div>
                    <input
                      id="profile-pic"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="text-foreground font-bold text-lg">
                  Age (Optional)
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-14 rounded-3xl border-3 border-primary/40 focus:border-primary transition-all text-lg"
                  min={13}
                  max={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground font-bold text-lg">
                  Bio (Optional)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-3xl border-3 border-secondary/40 focus:border-secondary transition-all min-h-[100px] text-lg"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests" className="text-foreground font-bold text-lg">
                  Interests (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="interests"
                    type="text"
                    placeholder="Add an interest"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                    className="rounded-3xl h-12 border-3 border-accent/40 focus:border-accent transition-all"
                  />
                  <Button
                    type="button"
                    onClick={addInterest}
                    className="rounded-3xl px-6 bg-gradient-accent shadow-glow-accent hover:scale-105 transition-all"
                  >
                    <Upload className="w-5 h-5" />
                  </Button>
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {interests.map((interest) => (
                      <Badge
                        key={interest}
                        className="bg-gradient-primary text-primary-foreground rounded-3xl px-4 py-2 text-base shadow-glow-primary hover:scale-105 transition-all animate-scale-in"
                      >
                        {interest}
                        <X
                          className="w-4 h-4 ml-2 cursor-pointer hover:text-destructive transition-colors"
                          onClick={() => removeInterest(interest)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 text-xl font-extrabold bg-gradient-rainbow hover:scale-105 shadow-3d hover:shadow-3d-hover transition-all rounded-3xl"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isLogin ? (
              "✨ Sign In ✨"
            ) : (
              "🎉 Join Now 🎉"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-card-foreground hover:text-primary transition-colors font-bold text-lg"
            disabled={loading}
          >
            {isLogin
              ? "Don't have an account? 🚀 Sign up"
              : "Already have an account? 👋 Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;

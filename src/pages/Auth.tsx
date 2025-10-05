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
import { Loader2, X, Upload } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { signupSchema, loginSchema } from "@/lib/validationSchemas";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Check if user is already logged in
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
      // Validate login input
      const validationResult = loginSchema.safeParse({ username, password });
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@taggy.app`,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
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
      // Validate signup input with Zod
      const validationResult = signupSchema.safeParse({
        username,
        password,
        displayName,
        bio: bio || undefined,
        age: age ? parseInt(age) : undefined,
        gender,
        interests: interests.length > 0 ? interests : undefined,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Sign up with username as email (username@taggy.app)
      const { data, error } = await supabase.auth.signUp({
        email: `${username}@taggy.app`,
        password,
        options: {
          data: {
            username: validationResult.data.username,
            display_name: validationResult.data.displayName,
            bio: validationResult.data.bio || null,
            age: validationResult.data.age || null,
            gender: validationResult.data.gender,
            interests: validationResult.data.interests?.join(",") || "",
          },
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Welcome to Taggy!",
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-secondary/80 to-accent/90 backdrop-blur-sm" />
      
      <Card className="relative z-10 w-full max-w-md p-8 bg-card/95 backdrop-blur-xl shadow-glow-primary rounded-3xl border-2 border-primary/20 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Taggy
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Welcome back!" : "Join the community"}
          </p>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground font-semibold">
              Username {!isLogin && <span className="text-xs text-muted-foreground">(for login)</span>}
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-full h-12 bg-background/50 border-2 border-primary/20 focus:border-primary transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full h-12 bg-background/50 border-2 border-primary/20 focus:border-primary transition-all"
              minLength={6}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground font-semibold">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name (shown on profile)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-full h-12 bg-background/50 border-2 border-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">
                  Profile Picture (Optional)
                </Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    {previewUrl ? (
                      <AvatarImage src={previewUrl} />
                    ) : (
                      <AvatarFallback className="bg-gradient-secondary">
                        <Upload className="w-8 h-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label htmlFor="profile-pic" className="cursor-pointer">
                    <div className="px-4 py-2 bg-gradient-secondary rounded-full text-sm font-semibold hover:scale-105 transition-transform">
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
                <Label htmlFor="age" className="text-foreground font-semibold">
                  Age (Optional)
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="rounded-full h-12 bg-background/50 border-2 border-primary/20 focus:border-primary transition-all"
                  min={13}
                  max={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-foreground font-semibold">
                  Gender <span className="text-destructive">*</span>
                </Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-full h-12 bg-background/50 border-2 border-primary/20 focus:border-primary transition-all px-4"
                  required
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground font-semibold">
                  Bio (Optional)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-2xl bg-background/50 border-2 border-primary/20 focus:border-primary transition-all min-h-[80px]"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests" className="text-foreground font-semibold">
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
                    className="rounded-full h-10 bg-background/50 border-2 border-primary/20 focus:border-primary transition-all"
                  />
                  <Button
                    type="button"
                    onClick={addInterest}
                    className="rounded-full px-6 bg-gradient-accent"
                  >
                    Add
                  </Button>
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {interests.map((interest) => (
                      <Badge
                        key={interest}
                        className="bg-gradient-secondary rounded-full px-3 py-1 flex items-center gap-1"
                      >
                        {interest}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
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
            className="w-full rounded-full h-12 bg-gradient-primary hover:scale-105 transition-transform shadow-glow-primary text-lg font-semibold"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              "Login"
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-primary/80 transition-colors font-semibold"
            disabled={loading}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;

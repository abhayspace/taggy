import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Discover from "./pages/Discover";
import Chat from "./pages/Chat";
import Conversation from "./pages/Conversation";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import { useLocation } from "react-router-dom";

const queryClient = new QueryClient();

const AppLayout = () => {
  const location = useLocation();
  const showBottomNav = ["/feed", "/discover", "/chat", "/profile", "/notifications"].includes(location.pathname);
  const hideBottomNav = location.pathname.startsWith("/conversation/");

  return (
    <>
      {showBottomNav && !hideBottomNav && <BottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/conversation/:conversationId" element={<Conversation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

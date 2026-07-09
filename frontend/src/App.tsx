/**
 * Root React component. Defines global providers, router and shared application shell.
 */
import { Toaster } from "./components/ui/toaster"; // Ajustei o @ para ./
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import RateMovies from "./pages/RateMovies";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Details from "./pages/Details";
import Profile from "./pages/Profile";
import Quiz from "./pages/Quiz";
import Requests from "./pages/Requests";
import Watchlist from "./pages/Watchlist";
import Admin from "./pages/Admin";
import Sobre from "./pages/Sobre";
import AdminRoute from "./components/AdminRoute";
import { queryClient } from "./lib/query-client";
import Footer from "./components/Footer";
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/rate-movies" element={<RateMovies />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/details/:mediaType/:id" element={<Details />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/sugestoes" element={<Requests />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/pedidos" element={<Requests />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

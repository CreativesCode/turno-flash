import { NativeBackButton } from "@/components/NativeBackButton";
import { AuthProvider } from "@/contexts/auth-context";

/**
 * Everything that knows about the session: landing, login, the panel and the
 * help. The route group keeps the URLs; it only leaves the public booking
 * pages out of the AuthProvider (P2-02).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <NativeBackButton />
    </AuthProvider>
  );
}

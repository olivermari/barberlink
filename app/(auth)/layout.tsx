// Each auth page draws its own full-bleed frame (components/auth/
// auth-screen.tsx): a dark hero and a form sheet on phones, an ink panel
// beside a form column on desktop.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

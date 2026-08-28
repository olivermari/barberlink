export type UserRole = "customer" | "barber" | "admin";

export function roleHomePath(role: UserRole | string | null | undefined) {
  switch (role) {
    case "barber":
      return "/barber";
    case "admin":
      return "/admin";
    default:
      return "/customer";
  }
}

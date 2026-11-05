import { auth } from "@/app/lib/auth";

export const { GET, POST, PUT, PATCH, DELETE } = auth.handler();

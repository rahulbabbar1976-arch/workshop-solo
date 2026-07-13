"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function getMyProfile() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("workshop_user_id")?.value;
  if (!userId) return null;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      profilePhotoUrl: true
    }
  });
  
  return user;
}

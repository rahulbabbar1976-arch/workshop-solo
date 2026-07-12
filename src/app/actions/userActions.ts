"use server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function uploadAvatarAction(base64Image: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  if (!userId) throw new Error("Not authenticated");

  await prisma.user.update({
    where: { id: userId },
    data: { profilePhotoUrl: base64Image }
  });
  
  return { success: true };
}

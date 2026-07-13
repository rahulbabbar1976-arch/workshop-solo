import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  if (!userId) redirect("/solo/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/solo/login");

  async function updateProfile(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('workshop_user_id')?.value;
    if (!currentUserId) return;

    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const mobile = formData.get("mobile") as string;
    const avatarFile = formData.get("avatar") as File;

    let profilePhotoUrl = undefined;

    if (avatarFile && avatarFile.size > 0) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      const filename = `${currentUserId}-${Date.now()}-${avatarFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      try {
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);
        profilePhotoUrl = `/uploads/${filename}`;
      } catch (err) {
        console.error("Avatar upload failed:", err);
      }
    }

    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        fullName,
        email,
        mobile,
        ...(profilePhotoUrl ? { profilePhotoUrl } : {})
      }
    });

    revalidatePath("/solo/profile");
  }

  return (
    <div className="content">
      <div className="section-title">My Profile</div>
      
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-4 max-w-xl">
        <form action={updateProfile} className="space-y-5">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
              {user.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-400">{user.fullName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Change Avatar</label>
              <input type="file" name="avatar" accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input type="text" name="fullName" defaultValue={user.fullName} className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
            <input type="tel" name="mobile" defaultValue={user.mobile || ''} className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" name="email" defaultValue={user.email || ''} className="w-full p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>

          <button type="submit" className="primary-btn amber mt-6">
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}

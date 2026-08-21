import knight from "@/assets/avatar-knight.png";
import mage from "@/assets/avatar-mage.png";
import robot from "@/assets/avatar-robot.png";

export const AVATARS = [
  { key: "knight", name: "Code Knight", src: knight, blurb: "สายบุกตะลุย เน้นลงมือเขียนโค้ดจริง" },
  { key: "mage", name: "Lab Mage", src: mage, blurb: "สายวิทยาศาสตร์ ชอบทดลองและวิเคราะห์" },
  { key: "robot", name: "Byte Bot", src: robot, blurb: "สายออโตเมชัน ชอบระบบและ logic" },
] as const;

export type AvatarKey = (typeof AVATARS)[number]["key"];

export function avatarSrc(key: string | null | undefined) {
  return (AVATARS.find((a) => a.key === key) ?? AVATARS[0]).src;
}

import React from "react";
import Link from "next/link";

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'landlord' | 'tenant' | 'admin';
  avatarUrl?: string;
  verificationStatus?: {
    status: 'pending' | 'approved' | 'rejected';
    idVerified?: boolean;
    faceMatched?: boolean;
    uploadedIdUrl?: string;
    selfieUrl?: string;
    idData?: {
      name?: string;
      idNumber?: string;
      birthDate?: string;
    };
  };
  isBlocked?: boolean;
}

interface LogoProps {
  size?: number;
  user?: User | null;
}

export default function Logo({ size = 150, user }: LogoProps) {
  const getDestination = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case "landlord":
        return "/dashboard";
      case "tenant":
        return "/";
      case "admin":
        return "/admin/dashboard";
      default:
        return "/";
    }
  };
  return (
    <Link href={getDestination()} className="inline-block cursor-pointer">
      <img
        src="/logo.png"
        alt="LeaseMate Logo"
        style={{ width: size, height: size }}
        className="object-contain"
      />
    </Link>
  );
}

import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 150 }: LogoProps) {
  return (
    <Link href="/" className="inline-block cursor-pointer">
      <img
        src="/logo.png"
        alt="LeaseMate Logo"
        style={{ width: size, height: size }}
        className="object-contain"
      />
    </Link>
  );
}

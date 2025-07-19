import React from "react";

interface PetPolicySectionProps {
  policy: string;
}

const PetPolicySection: React.FC<PetPolicySectionProps> = ({ policy }) => (
  <>
    <h2 className="text-[var(--dark-brown)] text-2xl font-bold leading-tight tracking-[-0.015em] text-right">
      سياسة الحيوانات الأليفة
    </h2>
    <p className="text-[var(--dark-brown)] text-lg font-normal leading-relaxed mt-4 text-right">
      {policy}
    </p>
  </>
);

export default PetPolicySection;
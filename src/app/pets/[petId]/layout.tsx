import type { ReactNode } from "react";
import { PetWorkspaceLayout } from "@/components/pet/PetWorkspace";

export default async function PetDetailLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ petId: string }>;
}>) {
  const { petId } = await params;

  return <PetWorkspaceLayout petId={petId}>{children}</PetWorkspaceLayout>;
}

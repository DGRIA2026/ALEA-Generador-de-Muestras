export type InviteUserPayload = {
  email: string;
  fullName: string;
  role: 'admin' | 'auditor';
  institution: string;
  institutionAcronym: string;
  position: string;
};

export function buildInviteUserPayload(
  input: InviteUserPayload,
): InviteUserPayload {
  return {
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    institution: input.institution,
    institutionAcronym: input.institutionAcronym,
    position: input.position,
  };
}

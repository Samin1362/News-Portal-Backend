import type { WithId } from 'mongodb';
import type { RoleRequestDoc } from '../models/roleRequest.model.js';
import type { RoleRequestStatus, Role } from '../config/constants.js';

export interface RoleRequestSubmittedInfoDTO {
  fullName: string;
  displayName: string;
  bio: string;
  expertiseTags: string[];
  sampleLinks: string[];
  motivation: string;
  phone: string | null;
  photoPublicId: string | null;
  agreedToGuidelinesAt: string;
  guidelinesVersion: string;
}

export interface RoleRequestDTO {
  id: string;
  userId: string;
  fromRole: Role;
  toRole: Role;
  status: RoleRequestStatus;
  submittedInfo: RoleRequestSubmittedInfoDTO;
  emailVerifiedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toRoleRequestDTO(doc: WithId<RoleRequestDoc>): RoleRequestDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    fromRole: doc.fromRole,
    toRole: doc.toRole,
    status: doc.status,
    submittedInfo: {
      fullName: doc.submittedInfo.fullName,
      displayName: doc.submittedInfo.displayName,
      bio: doc.submittedInfo.bio,
      expertiseTags: doc.submittedInfo.expertiseTags,
      sampleLinks: doc.submittedInfo.sampleLinks,
      motivation: doc.submittedInfo.motivation,
      phone: doc.submittedInfo.phone ?? null,
      photoPublicId: doc.submittedInfo.photoPublicId ?? null,
      agreedToGuidelinesAt: doc.submittedInfo.agreedToGuidelinesAt.toISOString(),
      guidelinesVersion: doc.submittedInfo.guidelinesVersion,
    },
    emailVerifiedAt: doc.emailVerifiedAt ? doc.emailVerifiedAt.toISOString() : null,
    decidedBy: doc.decidedBy ? doc.decidedBy.toString() : null,
    decidedAt: doc.decidedAt ? doc.decidedAt.toISOString() : null,
    decisionReason: doc.decisionReason,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toRoleRequestListDTO(
  docs: WithId<RoleRequestDoc>[],
): RoleRequestDTO[] {
  return docs.map(toRoleRequestDTO);
}

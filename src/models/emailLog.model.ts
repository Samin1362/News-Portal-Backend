import {
  ObjectId,
  type Collection,
  type Filter,
  type WithId,
} from 'mongodb';
import { getDb } from '../config/db.js';
import {
  COLLECTIONS,
  type EmailLogStatus,
  type EmailTemplate,
} from '../config/constants.js';

export interface EmailLogDoc {
  _id: ObjectId;
  to: string;
  template: EmailTemplate;
  subject: string;
  providerMessageId: string | null;
  status: EmailLogStatus;
  errorMessage: string | null;
  relatedUserId: ObjectId | null;
  relatedRoleRequestId: ObjectId | null;
  sentAt: Date;
}

function collection(): Collection<EmailLogDoc> {
  return getDb().collection<EmailLogDoc>(COLLECTIONS.EMAIL_LOG);
}

export async function recordSend(
  doc: Omit<EmailLogDoc, '_id'>,
): Promise<WithId<EmailLogDoc>> {
  const result = await collection().insertOne(doc as EmailLogDoc);
  return { ...(doc as EmailLogDoc), _id: result.insertedId };
}

export interface ListEmailLogParams {
  relatedUserId?: ObjectId;
  status?: EmailLogStatus;
  template?: EmailTemplate;
  page: number;
  limit: number;
  skip: number;
}

export async function listEmailLog(
  params: ListEmailLogParams,
): Promise<{ items: WithId<EmailLogDoc>[]; total: number }> {
  const filter: Filter<EmailLogDoc> = {};
  if (params.relatedUserId) filter.relatedUserId = params.relatedUserId;
  if (params.status) filter.status = params.status;
  if (params.template) filter.template = params.template;
  const cursor = collection()
    .find(filter)
    .sort({ sentAt: -1 })
    .skip(params.skip)
    .limit(params.limit);
  const [items, total] = await Promise.all([
    cursor.toArray(),
    collection().countDocuments(filter),
  ]);
  return { items, total };
}

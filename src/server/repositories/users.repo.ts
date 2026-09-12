import "server-only";
import { ObjectId } from "mongodb";
import { getMongoClient } from "@/server/db/mongo";
import type { Role } from "@/shared/types/user";

const COLLECTION = "users";

export type UserDoc = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  clientId: ObjectId | null;
  createdAt: Date;
};

async function collection() {
  const client = await getMongoClient();
  return client.db().collection<UserDoc>(COLLECTION);
}

export async function findByEmail(email: string): Promise<UserDoc | null> {
  return (await collection()).findOne({ email });
}

export async function findById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await collection()).findOne({ _id: new ObjectId(id) });
}

export async function create(input: {
  email: string;
  passwordHash: string;
  role: Role;
  clientId?: ObjectId | null;
}): Promise<UserDoc> {
  const doc: UserDoc = {
    _id: new ObjectId(),
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    clientId: input.clientId ?? null,
    createdAt: new Date(),
  };
  await (await collection()).insertOne(doc);
  return doc;
}

import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface UploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  path: string;
}

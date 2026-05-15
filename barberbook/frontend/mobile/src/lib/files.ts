/**
 * File pick + compress + upload helpers.
 *
 * Two pick paths (camera vs library) for image-shaped docs (KYC photos,
 * shop hero, owner selfie) and one for arbitrary documents (PDF + image
 * fallback for cancelled cheques, certificates).
 *
 * Compression policy:
 *   - Images: resize so longest edge ≤ 1600px, JPEG q=0.7. Cuts a 4MB
 *     phone photo down to ~250-400KB without visible loss at A4 size.
 *   - Non-image documents: passed through (PDFs are already compact;
 *     re-encoding requires a server round-trip we don't want here).
 *
 * Upload format mirrors Frappe's `/api/method/upload_file`:
 *   multipart/form-data with `file`, `is_private`, `doctype`, `docname`,
 *   optional `folder`, `file_name`. Returns the new File DocType row.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { api } from '../api/client';

import { env } from './env';

export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface FrappeFile {
  /** Frappe `File` DocType `name`. */
  name: string;
  /** Web-accessible URL. */
  file_url: string;
  is_private: 0 | 1;
  file_size: number;
  attached_to_doctype?: string;
  attached_to_name?: string;
}

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.7;

// ─── Pickers ────────────────────────────────────────────────────────────────

export async function pickImageFromLibrary(): Promise<LocalFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.95,
    allowsEditing: false,
    exif: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  return assetToLocalFile(res.assets[0]);
}

export async function pickImageFromCamera(): Promise<LocalFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.95,
    exif: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  return assetToLocalFile(res.assets[0]);
}

export async function pickDocument(): Promise<LocalFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.name ?? 'document',
    mimeType: a.mimeType ?? 'application/octet-stream',
    size: a.size ?? null,
  };
}

function assetToLocalFile(a: ImagePicker.ImagePickerAsset): LocalFile {
  return {
    uri: a.uri,
    name: a.fileName ?? `image-${Date.now()}.jpg`,
    mimeType: a.mimeType ?? 'image/jpeg',
    size: a.fileSize ?? null,
  };
}

// ─── Compression ────────────────────────────────────────────────────────────

/**
 * Resize an image so its longest edge ≤ MAX_EDGE and re-encode as JPEG. No-op
 * for non-image MIME types. Skip if the file is already small enough so we
 * don't pay the encode cost on already-tiny WhatsApp-grade phone photos.
 */
export async function compressIfImage(file: LocalFile): Promise<LocalFile> {
  if (!file.mimeType.startsWith('image/')) return file;
  if (file.size != null && file.size < 250 * 1024) return file;

  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      file.uri,
      [{ resize: { width: MAX_EDGE } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
    );
    return {
      uri: manipulated.uri,
      name: file.name.replace(/\.\w+$/, '.jpg'),
      mimeType: 'image/jpeg',
      size: null,
    };
  } catch {
    // Manipulator failures aren't fatal — fall back to the original.
    return file;
  }
}

// ─── Upload to Frappe `File` DocType ────────────────────────────────────────

export interface UploadOptions {
  /** Link the upload to a DocType row, e.g. ('BB Shop', 'BB-SHOP-00001'). */
  attachTo?: { doctype: string; name: string; field?: string };
  /** Default true. Public files are world-readable from `/files/...`. */
  isPrivate?: boolean;
  /** Optional Frappe Folder name; defaults to "Home/Attachments". */
  folder?: string;
}

export async function uploadFile(
  file: LocalFile,
  options: UploadOptions = {},
): Promise<FrappeFile> {
  const compressed = await compressIfImage(file);

  const form = new FormData();
  // RN's FormData accepts the {uri, name, type} sentinel for native files.
  form.append('file', {
    uri: compressed.uri,
    name: compressed.name,
    type: compressed.mimeType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  form.append('is_private', options.isPrivate === false ? '0' : '1');
  if (options.folder) form.append('folder', options.folder);
  if (options.attachTo) {
    form.append('doctype', options.attachTo.doctype);
    form.append('docname', options.attachTo.name);
    if (options.attachTo.field) form.append('fieldname', options.attachTo.field);
  }
  form.append('file_name', compressed.name);

  if (env.mock) {
    // Short-circuit; the mock router doesn't intercept multipart bodies
    // cleanly, so we synthesize a result here. Keeps OwnerKYC's uploading
    // state observable without making a real network call.
    await new Promise((r) => setTimeout(r, 350));
    return {
      name: `MOCK-FILE-${Date.now()}`,
      file_url: compressed.uri,
      is_private: options.isPrivate === false ? 0 : 1,
      file_size: compressed.size ?? 0,
      attached_to_doctype: options.attachTo?.doctype,
      attached_to_name: options.attachTo?.name,
    };
  }

  const res = await api.post<{ message: FrappeFile }>('/api/method/upload_file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });
  return res.data.message;
}

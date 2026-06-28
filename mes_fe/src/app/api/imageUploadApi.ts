import apiClient from "./apiClient";

export type UploadDomain =
  | "item"
  | "facility"
  | "instrument"
  | "spare-part"
  | "inspect-std";

export interface UploadedImage {
  path: string;
  url: string;
  fileName?: string;
}

// apiClient.baseURL 은 이미 "/api" 로 끝남(VITE_API_BASE_URL). 정적 파일(/files/**)은
// /api 하위가 아니라 백엔드 루트에서 서빙되므로, /api 를 떼어낸 origin 기준으로 URL 을 만든다.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;
const fileBaseUrl = (apiBaseUrl ?? "").replace(/\/api\/?$/, "");

const resolveImageSrc = (value: string | null | undefined): string => {
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("blob:")) {
    return value;
  }
  if (value.startsWith("/files/")) {
    return `${fileBaseUrl}${value}`;
  }
  return `${fileBaseUrl}/files/${value}`;
};

const isDataUrl = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.startsWith("data:");

const isStoredPath = (value: string | null | undefined): boolean =>
  typeof value === "string" && !isDataUrl(value) && !value.startsWith("blob:");

const dataUrlToBlob = (dataUrl: string): Blob | null => {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;
  const meta = dataUrl.substring(5, commaIdx);
  const payload = dataUrl.substring(commaIdx + 1);
  const isBase64 = meta.endsWith(";base64");
  const mime = isBase64 ? meta.slice(0, -7) : meta;
  try {
    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime || "application/octet-stream" });
    }
    return new Blob([decodeURIComponent(payload)], {
      type: mime || "application/octet-stream",
    });
  } catch {
    return null;
  }
};

const extFromMime = (mime: string): string => {
  if (!mime) return "";
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("pdf")) return ".pdf";
  return "";
};

export const uploadDataUrl = async (
  domain: UploadDomain,
  key: string,
  dataUrl: string,
): Promise<UploadedImage> => {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) throw new Error("이미지 데이터를 읽지 못했습니다.");
  const ext = extFromMime(blob.type);
  const file = new File([blob], `upload${ext}`, { type: blob.type || "application/octet-stream" });
  const form = new FormData();
  form.append("file", file);
  const safeKey = encodeURIComponent(key);
  const res = await apiClient.post(`/images/${domain}/${safeKey}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data as UploadedImage;
};

export const ensureImagePath = async (
  domain: UploadDomain,
  key: string,
  value: string | null | undefined,
): Promise<string | null> => {
  if (!value) return null;
  if (isStoredPath(value)) {
    if (value.startsWith("/files/")) return value.slice("/files/".length);
    return value;
  }
  if (isDataUrl(value)) {
    const uploaded = await uploadDataUrl(domain, key, value);
    return uploaded.path;
  }
  return null;
};

export const ensureImagePaths = async (
  domain: UploadDomain,
  key: string,
  values: Array<string | null | undefined>,
): Promise<string[]> => {
  const results: string[] = [];
  for (const value of values) {
    const path = await ensureImagePath(domain, key, value);
    if (path) results.push(path);
  }
  return results;
};

export const deleteImage = async (path: string): Promise<void> => {
  await apiClient.delete(`/images`, { params: { path } });
};

export { resolveImageSrc, isDataUrl, isStoredPath };

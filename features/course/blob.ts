import { put, del } from "@vercel/blob";

export type UploadedBlob = {
  url: string;
  pathname: string;
};

export async function putAudio(
  pathname: string,
  body: Buffer,
  contentType = "audio/mpeg",
): Promise<UploadedBlob> {
  const result = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function delBlob(pathname: string): Promise<void> {
  await del(pathname);
}

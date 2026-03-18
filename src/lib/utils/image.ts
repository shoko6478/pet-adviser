export interface ResizeImageOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  mimeType?: string;
}

export async function resizeImageFile(
  file: File,
  { maxWidth, maxHeight, quality = 0.82, mimeType = "image/jpeg" }: ResizeImageOptions,
): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const { width, height } = fitIntoBounds(image.width, image.height, maxWidth, maxHeight);

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("画像の処理に失敗しました。別の画像でお試しください。");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL(mimeType, quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像ファイルを読み込めませんでした。"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("画像ファイルを読み込めませんでした。"));
      }
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("画像を開けませんでした。"));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

function fitIntoBounds(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

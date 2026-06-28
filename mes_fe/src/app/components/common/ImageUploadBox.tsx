import { useRef, type ChangeEvent } from "react";
import { Upload, FileText, ExternalLink } from "lucide-react";
import { resolveImageSrc } from "@/app/api/imageUploadApi";
import { ACCEPT } from "@/app/utils/fileUpload";
import { showWarning } from "@/app/utils/toast";

/** accept 속성(확장자/MIME 토큰)에 파일이 부합하는지 검증 */
const matchesAccept = (file: File, accept: string): boolean => {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
};

type Variant = "dashed" | "plain";

interface ImageUploadBoxProps {
  value: string | null | undefined;
  onChange?: (dataUrl: string | null) => void;
  editable?: boolean;
  alt?: string;
  uploadLabel?: string;
  uploadHint?: string;
  emptyText?: string;
  className?: string;
  variant?: Variant;
  accept?: string;
}

const isPath = (value: string): boolean =>
  !value.startsWith("data:") && !value.startsWith("blob:") && !value.startsWith("http");

const variantClass: Record<Variant, { editable: string; readonly: string }> = {
  dashed: {
    editable:
      "border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors",
    readonly: "border border-gray-300 bg-gray-50",
  },
  plain: {
    editable: "border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors",
    readonly: "border border-gray-200 bg-gray-50",
  },
};

const isPdfDataUrl = (value: string) =>
  value.startsWith("data:application/pdf") ||
  /\.pdf(\?|#|$)/i.test(value);

const toDisplaySrc = (value: string): string =>
  isPath(value) ? resolveImageSrc(value) : value;

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
  } catch (e) {
    console.error("Failed to parse data URL:", e);
    return null;
  }
};

const openInNewTab = (value: string) => {
  if (!value.startsWith("data:")) {
    window.open(value, "_blank", "noopener,noreferrer");
    return;
  }
  const blob = dataUrlToBlob(value);
  if (!blob) return;
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

export function ImageUploadBox({
  value,
  onChange,
  editable = true,
  alt = "이미지",
  uploadLabel = "이미지 업로드",
  uploadHint = "클릭하여 이미지 선택",
  emptyText = "이미지 없음",
  className = "",
  variant = "dashed",
  accept = ACCEPT.IMAGE,
}: ImageUploadBoxProps) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const emitFile = async (file: File | null | undefined) => {
    if (!file || !onChange) return;
    if (!matchesAccept(file, accept)) {
      showWarning(`허용되지 않은 파일 형식입니다. (허용: ${accept})`);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
    } catch (error) {
      console.error("Failed to read file:", error);
    }
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    emitFile(file);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.(null);
  };

  const handleReplaceClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    replaceInputRef.current?.click();
  };

  const styles = variantClass[variant];
  const baseClass = `rounded-lg flex items-center justify-center overflow-hidden ${
    editable ? styles.editable : styles.readonly
  }`;

  if (!value) {
    if (!editable) {
      return (
        <div className={`${baseClass} ${className}`}>
          <span className="text-xs text-gray-400">{emptyText}</span>
        </div>
      );
    }
    return (
      <label
        className={`${baseClass} ${className} cursor-pointer flex-col`}
      >
        <Upload className="w-10 h-10 text-gray-400 mb-2" />
        <span className="text-sm text-gray-500 font-medium">{uploadLabel}</span>
        <span className="text-xs text-gray-400 mt-1">{uploadHint}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleUploadChange}
        />
      </label>
    );
  }

  const isPdf = isPdfDataUrl(value);
  const displaySrc = toDisplaySrc(value);

  return (
    <div className={`${baseClass} ${className} relative`}>
      {isPdf ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white">
          <FileText className="w-12 h-12 text-red-500" />
          <span className="text-sm text-gray-700 font-medium">PDF 첨부됨</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openInNewTab(displaySrc);
            }}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            새 창에서 열기
          </button>
        </div>
      ) : (
        <img
          src={displaySrc}
          alt={alt}
          className="w-full h-full object-cover rounded-lg"
        />
      )}
      {editable && (
        <>
          <button
            type="button"
            onClick={handleClear}
            title={isPdf ? "파일 제거" : "이미지 제거"}
            aria-label={isPdf ? "파일 제거" : "이미지 제거"}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow"
          >
            ×
          </button>
          <button
            type="button"
            onClick={handleReplaceClick}
            title={isPdf ? "파일 교체" : "이미지 교체"}
            className="absolute bottom-2 right-2 bg-white/90 text-gray-700 border border-gray-300 rounded-md px-3 py-1 text-xs hover:bg-white shadow"
          >
            교체
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleUploadChange}
          />
        </>
      )}
    </div>
  );
}

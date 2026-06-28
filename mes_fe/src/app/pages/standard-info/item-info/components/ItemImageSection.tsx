import { ImageUploadBox } from "@/app/components/common/ImageUploadBox";

interface ItemImageSectionProps {
  image1?: string | null;
  image2?: string | null;
  editable?: boolean;
  onImageChange?: (imageNumber: 1 | 2, dataUrl: string | null) => void;
}

type Slot = 1 | 2;

export function ItemImageSection({
  image1,
  image2,
  editable = false,
  onImageChange,
}: ItemImageSectionProps) {
  // 두 장의 품목 이미지 슬롯을 동일한 박스로 렌더링한다.
  const slots: { slot: Slot; value?: string | null }[] = [
    { slot: 1, value: image1 },
    { slot: 2, value: image2 },
  ];

  return (
    <div className="flex-shrink-0 w-80">
      <div className="flex flex-col gap-4">
        {slots.map(({ slot, value }) => (
          <ImageUploadBox
            key={slot}
            value={value}
            editable={editable}
            alt={`품목 이미지 ${slot}`}
            uploadLabel="이미지 업로드"
            uploadHint="클릭하여 이미지 선택"
            className="h-[180px]"
            onChange={(dataUrl) => onImageChange?.(slot, dataUrl)}
          />
        ))}
      </div>
    </div>
  );
}

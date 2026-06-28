import { ITEM_FORM_INITIAL_DATA } from "@/app/constants/item";
import type {
  ItemFormData,
  ItemListRow,
  ItemRes,
  ItemSaveData,
  ItemSearchForm,
  ItemSpecInfo,
} from "@/types/standard-info/item.interface";

const PLACEHOLDER = "-";

const isBlank = (value?: string | number | null): boolean =>
  value === null || value === undefined || value === "";

const cellText = (value?: string | number | null): string =>
  isBlank(value) ? PLACEHOLDER : String(value);

const lower = (value: string): string => value.trim().toLowerCase();

const toOptionalNumber = (value: string): number | null => {
  const text = value.trim();
  if (text.length === 0) return null;
  const parsed = Number(text);
  return Number.isNaN(parsed) ? null : parsed;
};

const numericOrNull = (value?: string | number | null): number | null => {
  if (isBlank(value)) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export function sortSpecsByWidthAsc<
  T extends { width?: string | number | null },
>(specs: readonly T[]): T[] {
  // nulls sink to the bottom, otherwise ascending by numeric width
  return [...specs].sort((a, b) => {
    const widthA = numericOrNull(a.width);
    const widthB = numericOrNull(b.width);
    if (widthA === null) return widthB === null ? 0 : 1;
    if (widthB === null) return -1;
    return widthA - widthB;
  });
}

export function createEmptyItemSearchForm(): ItemSearchForm {
  return {
    accountType: "",
    itemCode: "",
    itemName: "",
    spec: "",
  };
}

export function createEmptyItemFormData(): ItemFormData {
  return ITEM_FORM_INITIAL_DATA();
}

function buildRowFromItem(item: ItemRes): ItemListRow {
  return {
    id: String(item.itemSq),
    NO: "",
    accountType: cellText(item.accountType),
    itemCode: cellText(item.itemCode),
    itemName: cellText(item.itemName),
    spec: cellText(item.spec),
    basisWeight: cellText(item.basisWeight),
    width: cellText(item.width),
    length: cellText(item.length),
    weight: cellText(item.weight),
    safetyStock: cellText(item.safetyStock),
  };
}

export function createItemListRows(items: ItemRes[]): ItemListRow[] {
  const rows: ItemListRow[] = [];

  for (const item of items) {
    const specs = item.specs ?? [];

    if (specs.length === 0) {
      rows.push(buildRowFromItem(item));
      continue;
    }

    // one row per spec, ordered by descending specOrder
    const ordered = [...specs].sort(
      (a, b) => (b.specOrder ?? 0) - (a.specOrder ?? 0),
    );

    for (const spec of ordered) {
      rows.push({
        ...buildRowFromItem(item),
        width: cellText(spec.width),
        length: cellText(spec.length),
        weight: cellText(spec.weight),
        safetyStock: cellText(spec.safetyStock),
      });
    }
  }

  rows.sort((a, b) => {
    const byAccount = a.accountType.localeCompare(b.accountType, "ko");
    if (byAccount !== 0) return byAccount;
    const byCode = a.itemCode.localeCompare(b.itemCode, "ko");
    if (byCode !== 0) return byCode;
    return a.itemName.localeCompare(b.itemName, "ko");
  });

  rows.forEach((row, index) => {
    row.NO = String(index + 1);
  });

  return rows;
}

export function filterItemListRows(
  rows: ItemListRow[],
  searchFilters: ItemSearchForm,
) {
  const accountType = searchFilters.accountType.trim();
  const itemCode = lower(searchFilters.itemCode);
  const itemName = lower(searchFilters.itemName);
  const spec = lower(searchFilters.spec);

  const matches = (haystack: string, needle: string) =>
    needle === "" || haystack.toLowerCase().includes(needle);

  return rows.filter((row) => {
    if (accountType && row.accountType !== accountType) return false;
    if (!matches(row.itemCode, itemCode)) return false;
    if (!matches(row.itemName, itemName)) return false;
    if (!matches(row.spec, spec)) return false;
    return true;
  });
}

const stringifyOrEmpty = (value?: string | number | null): string =>
  value != null ? String(value) : "";

export function createItemFormData(item: ItemRes): ItemFormData {
  return {
    itemType: item.itemType || "",
    customerName: item.customerName || "",
    itemCode: item.itemCode || "",
    itemName: item.itemName || "",
    accountType: item.accountType || "",
    spec: item.spec || "",
    basisWeight: stringifyOrEmpty(item.basisWeight),
    width: stringifyOrEmpty(item.width),
    color: item.color || "",
    weight: stringifyOrEmpty(item.weight),
    length: stringifyOrEmpty(item.length),
    productionSpeed: stringifyOrEmpty(item.productionSpeed),
    widthUnit: item.widthUnit || "",
    importInspGb: getImportInspectionFlag(item.importInspGb),
    packingUnit: item.packingUnit || "",
    safetyStock: stringifyOrEmpty(item.safetyStock),
    remark: item.remark || "",
    specs: sortSpecsByWidthAsc(item.specs ?? []).map((spec) => ({
      itemSpecSq: spec.itemSpecSq,
      width: stringifyOrEmpty(spec.width),
      length: stringifyOrEmpty(spec.length),
      basisWeight: stringifyOrEmpty(spec.basisWeight),
      safetyStock: stringifyOrEmpty(spec.safetyStock),
      weight: stringifyOrEmpty(spec.weight),
      specOrder: spec.specOrder,
      warehouseLocation: spec.warehouseLocation || "",
      storageLocation: spec.storageLocation || "",
    })),
  };
}

function getImportInspectionFlag(value?: boolean | null): string {
  if (value === true) return "유";
  if (value === false) return "무";
  return "";
}

function specHasAnyValue(spec: ItemFormData["specs"][number]): boolean {
  return Boolean(
    spec.width ||
      spec.length ||
      spec.basisWeight ||
      spec.weight ||
      spec.safetyStock ||
      spec.warehouseLocation ||
      spec.storageLocation,
  );
}

export function createItemSaveData(
  formData: ItemFormData,
  image1: string | null,
  image2: string | null,
): ItemSaveData {
  const imgPaths = [image1, image2].filter(
    (path): path is string => Boolean(path),
  );

  const specs = sortSpecsByWidthAsc(
    formData.specs.filter(specHasAnyValue),
  ).map((spec, index) => ({
    itemSpecSq: spec.itemSpecSq || undefined,
    width: toOptionalNumber(spec.width),
    length: toOptionalNumber(spec.length),
    basisWeight: toOptionalNumber(spec.basisWeight),
    safetyStock: toOptionalNumber(spec.safetyStock),
    weight: toOptionalNumber(spec.weight),
    specOrder: index + 1,
    warehouseLocation: spec.warehouseLocation || undefined,
    storageLocation: spec.storageLocation || undefined,
  }));

  let importInspGb: boolean | null = null;
  if (formData.importInspGb === "유") importInspGb = true;
  else if (formData.importInspGb === "무") importInspGb = false;

  return {
    itemCode: formData.itemCode,
    itemName: formData.itemName,
    itemType: formData.itemType || undefined,
    customerName: formData.customerName || undefined,
    accountType: formData.accountType || undefined,
    spec: formData.spec || undefined,
    basisWeight: toOptionalNumber(formData.basisWeight),
    width: toOptionalNumber(formData.width),
    widthUnit: formData.widthUnit || undefined,
    length: toOptionalNumber(formData.length),
    weight: toOptionalNumber(formData.weight),
    color: formData.color || undefined,
    productionSpeed: toOptionalNumber(formData.productionSpeed),
    packingUnit: formData.packingUnit || undefined,
    safetyStock: toOptionalNumber(formData.safetyStock),
    importInspGb,
    remark: formData.remark || undefined,
    imgPaths: imgPaths.length > 0 ? imgPaths : undefined,
    useYn: true,
    specs: specs.length > 0 ? specs : undefined,
  };
}

export function createEmptyItemSpec(): ItemSpecInfo {
  return {
    width: "",
    length: "",
    basisWeight: "",
    weight: "",
    safetyStock: "",
    warehouseLocation: "",
    storageLocation: "",
  };
}

export function getImportInspectionLabel(value?: boolean | null) {
  if (value === true) return "유";
  if (value === false) return "무";
  return "-";
}

export function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image file."));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

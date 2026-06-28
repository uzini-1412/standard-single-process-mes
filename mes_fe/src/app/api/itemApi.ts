/** 품목 API 클라이언트 — BE /api/item (ItemController). [기준정보관리 > 품목정보관리]. 품목 마스터는 거의 전 화면이 참조. */
import { postJson, postVoid, putJson } from "./request";
import type {
  ItemRes as SharedItemRes,
  ItemSaveData as SharedItemSaveData,
  ItemSearchParams as SharedItemSearchParams,
  ItemSpecData as SharedItemSpecData,
  ItemSpecRes as SharedItemSpecRes,
  ItemUpdateData as SharedItemUpdateData,
} from "@/types/standard-info/item.interface";

export interface ItemSearchParams extends SharedItemSearchParams {}

export interface ItemSpecData extends SharedItemSpecData {}

export interface ItemSpecRes extends SharedItemSpecRes {}

export interface ItemSaveData extends SharedItemSaveData {}

export interface ItemUpdateData extends SharedItemUpdateData {}

export interface ItemRes extends SharedItemRes {}

export function fetchItemList(
  params: ItemSearchParams = {},
): Promise<ItemRes[]> {
  return postJson<ItemRes[]>("/item/list", params);
}

export function fetchItemById(itemSq: string | number): Promise<ItemRes> {
  return postJson<ItemRes>("/item/detail", { itemSq: Number(itemSq) });
}

export function createItem(data: ItemSaveData): Promise<void> {
  return postVoid("/item/save", [data]);
}

export function updateItem(
  itemSq: string | number,
  data: ItemSaveData,
): Promise<void> {
  return putJson<void>("/item/update", [{ ...data, itemSq: Number(itemSq) }]);
}

export function deleteItem(itemSq: string | number): Promise<void> {
  return postVoid("/item/delete", { itemIds: [Number(itemSq)] });
}

import { postData } from './http';
import type { RecipeRes } from '../types';

/** 완제품 품목(productItemSq) 기준으로 연결된 레시피(BOM) 목록을 조회한다. */
export const fetchRecipeList = (productItemSq: number): Promise<RecipeRes[]> =>
  postData<RecipeRes[]>('/recipe/list', { productItemSq });

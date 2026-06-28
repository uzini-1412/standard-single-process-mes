import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchWorkOrderList } from '../api/workOrderApi';
import { fetchRecipeList } from '../api/recipeApi';

interface MaterialChildRow {
  id: string;
  materialType: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  reqQty: number;
  ratio: number;
}

interface RecipeParentRow {
  id: string;
  lineName: string;
  prodCode: string;
  prodName: string;
  planQty: number;
  recipeNo: string;
  children: MaterialChildRow[];
}

// 숫자를 천단위 구분 문자열로 다듬고 뒤에 단위를 이어붙인다
const toQtyLabel = (amount: number, suffix = '') =>
  `${Number(amount || 0).toLocaleString()}${suffix}`;

// 작업지시 1건의 세부 항목들로부터 전체 면적을 합산한다 (mm 단위를 보정)
const sumArea = (lineItems: ReadonlyArray<{ width?: number | null; length?: number | null }>) =>
  lineItems.reduce((acc, it) => acc + ((it.width ?? 0) * (it.length ?? 0)) / 1000, 0);

// 한 작업지시와 그에 매핑된 레시피 묶음을 화면용 부모/자식 행으로 변환
function buildParentRow(order: any, recipeList: any[]): RecipeParentRow {
  const reqTotal = recipeList.reduce(
    (acc: number, item: any) => acc + (Number(item.requiredQty) || 0),
    0
  );
  const area = sumArea(order.details ?? []);
  const pickedRecipeNo = recipeList.find((item: any) => item.recipeNo)?.recipeNo || '';
  const rowKey = `${order.workOrderSq}-${pickedRecipeNo || order.itemSq}`;
  const headRecipe = recipeList[0];

  const childList: MaterialChildRow[] = recipeList.map((item: any) => {
    const need = Number(item.requiredQty) || 0;
    return {
      id: `${rowKey}-${item.recipeSq}`,
      materialType: item.materialType || '',
      materialCode: item.materialCode || item.materialItemCode || '',
      materialName: item.materialName || item.materialItemName || '',
      materialSpec: item.materialSpec || '',
      reqQty: Math.round(need * area),
      ratio: reqTotal > 0 ? (need / reqTotal) * 100 : (Number(item.ratio) || 0),
    };
  });

  return {
    id: rowKey,
    lineName: order.lineName || '',
    prodCode: order.itemCode || headRecipe?.productCode || headRecipe?.productItemCode || '',
    prodName: order.itemName || headRecipe?.productName || headRecipe?.productItemName || '',
    planQty: order.targetQty || 0,
    recipeNo: pickedRecipeNo,
    children: childList,
  };
}

export default function MaterialStdPage() {
  const { toast } = useToast();

  // 조회 조건 상태
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lineChoice, setLineChoice] = useState('all');
  const [productChoice, setProductChoice] = useState('all');

  // 결과 / 표시 상태
  const [tableRows, setTableRows] = useState<RecipeParentRow[]>([]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);

  const refresh = useCallback(async () => {
    setIsFetching(true);
    try {
      const orderList = await fetchWorkOrderList({ dateFrom: selectedDate, dateTo: selectedDate });
      const ordersHavingItem = orderList.filter(o => o.itemSq);
      const anyOrderHasItem = ordersHavingItem.length > 0;

      // 동일한 품목은 한 번만 레시피를 조회하도록 중복 제거
      const itemSqSet = Array.from(new Set(ordersHavingItem.map(o => o.itemSq as number)));
      const recipesByItem = new Map<number, any[]>();
      await Promise.all(
        itemSqSet.map(async (itemSq) => {
          try {
            recipesByItem.set(itemSq, await fetchRecipeList(itemSq));
          } catch {
            recipesByItem.set(itemSq, []);
          }
        })
      );

      // 레시피가 존재하는 작업지시만 행으로 누적
      const assembled = ordersHavingItem.reduce<RecipeParentRow[]>((acc, order) => {
        const recipeList = recipesByItem.get(order.itemSq as number) || [];
        if (recipeList.length > 0) {
          acc.push(buildParentRow(order, recipeList));
        }
        return acc;
      }, []);

      setTableRows(assembled);
      setOpenKeys(new Set(assembled.map(row => row.id)));

      // 결과 유형별 안내 메시지
      if (orderList.length === 0 || !anyOrderHasItem) {
        toast('데이터 없음', '해당 작업일에 내려진 작업지시가 없습니다', 'warn');
      } else if (assembled.length === 0) {
        toast('데이터 없음', '등록된 레시피가 없습니다', 'warn');
      }
    } catch {
      toast('조회 실패', '데이터를 불러올 수 없습니다', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [selectedDate, toast]);

  // 조회 조건(작업일) 변경 시 자동 재조회
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 라인 셀렉트에 채울 후보 목록
  const lineOptions = useMemo(
    () => Array.from(new Set(tableRows.map(row => row.lineName))).filter(Boolean),
    [tableRows]
  );

  // 품번 탭에 채울 후보 목록
  const productOptions = useMemo(
    () => Array.from(new Set(tableRows.map(row => row.prodCode))).filter(Boolean),
    [tableRows]
  );

  // 라인/품번 선택값에 맞춰 행을 좁힌다
  const visibleRows = useMemo(
    () =>
      tableRows.filter(row => {
        const lineOk = lineChoice === 'all' || row.lineName === lineChoice;
        const productOk = productChoice === 'all' || row.prodCode === productChoice;
        return lineOk && productOk;
      }),
    [tableRows, lineChoice, productChoice]
  );

  // 특정 부모 행의 펼침 상태를 토글
  const handleToggle = (key: string) => {
    setOpenKeys(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="tablet-toolbar tablet-toolbar--end" style={{ marginBottom: 16 }}>
          <button className="btn btn-outline tablet-btn" onClick={refresh}>
            새로고침
          </button>
        </div>
        <div className="tablet-toolbar tablet-toolbar--stack">
          <div className="form-group tablet-field tablet-field--grow">
            <label className="form-label">라인구분</label>
            <select className="input tablet-input" value={lineChoice} onChange={e => setLineChoice(e.target.value)}>
              <option value="all">전체</option>
              {lineOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group tablet-field tablet-field--grow">
            <label className="form-label">작업일</label>
            <input
              type="date"
              className="input tablet-input tablet-date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-tabs">
          <div className={`filter-tab ${productChoice === 'all' ? 'on' : ''}`} onClick={() => setProductChoice('all')}>전체</div>
          {productOptions.map(code => (
            <div key={code} className={`filter-tab ${productChoice === code ? 'on' : ''}`} onClick={() => setProductChoice(code)}>
              {code}
            </div>
          ))}
        </div>
      </div>
      <div data-help="materialStd-main">
      {isFetching ? (
        <div className="loading">데이터 로딩 중...</div>
      ) : (
        <table className="tbl material-std-table">
          <thead>
            <tr>
              <th style={{ width: 44 }} />
              <th style={{ width: 70 }}>라인</th>
              <th style={{ width: 90 }}>품명</th>
              <th style={{ width: 90 }}>품번</th>
              <th style={{ width: 95 }}>생산계획량</th>
              <th style={{ width: 120 }}>레시피번호</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => {
              const isOpen = openKeys.has(row.id);
              return (
                <Fragment key={row.id}>
                  <tr className="recipe-parent-row" onClick={() => handleToggle(row.id)}>
                    <td>
                      <button className="tree-toggle" type="button" aria-label="레시피 소재 목록 열기">
                        {isOpen ? '−' : '+'}
                      </button>
                    </td>
                    <td><span className="line-tag">{row.lineName}</span></td>
                    <td>{row.prodName}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.prodCode}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{toQtyLabel(row.planQty, 'm')}</td>
                    <td style={{ fontWeight: 700 }}>{row.recipeNo || '-'}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${row.id}-children`} className="recipe-child-wrap">
                      <td />
                      <td colSpan={5}>
                        <table className="tbl nested-tbl">
                          <thead>
                            <tr>
                              <th>소재구분</th>
                              <th>소재품번</th>
                              <th>소재품명</th>
                              <th>규격</th>
                              <th>소요량</th>
                              <th>비중</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.children.map(child => {
                              const ratioWidth = Math.min(child.ratio, 100);
                              return (
                                <tr key={child.id}>
                                  <td><span className="process-tag">{child.materialType || '-'}</span></td>
                                  <td style={{ fontWeight: 700 }}>{child.materialCode || '-'}</td>
                                  <td>{child.materialName || '-'}</td>
                                  <td>{child.materialSpec || '-'}</td>
                                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{toQtyLabel(child.reqQty, 'g')}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                      <div className="ratio-bar" style={{ flex: 1 }}>
                                        <div className="ratio-bar-fill" style={{ width: `${ratioWidth}%` }} />
                                      </div>
                                      <span style={{ fontWeight: 700, minWidth: 48, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {child.ratio.toFixed(2)}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visibleRows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--sub)', padding: 20 }}>데이터가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}

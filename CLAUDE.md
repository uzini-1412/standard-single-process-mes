# standard-mes

고객 프로젝트 `sangwoo-mes-mng`(형제 폴더)를 **일반화한 포폴용 MES**. 목표는 sangwoo와 겹치는 코드·로직을 최소화하는 것.

## 일반화 작업을 맡았다면
- **할 일 목록: [docs/generalization-todo.md](docs/generalization-todo.md)** — 가장 빨간(유사도 높은) 파일부터 정렬돼 있고, 작업 지침이 그 안에 들어있다. 맨 위부터 집어서 일반화하라.
- 전체 현황: [docs/generalization-overlap.md](docs/generalization-overlap.md)
- 파일을 수정하면 PostToolUse 훅(`.claude/scripts/overlap.py`)이 그 파일의 sangwoo 유사도를 자동 재계산해 위 두 MD를 갱신한다. 스크립트를 직접 돌릴 필요 없음.
- 유사도는 **현재 디스크(작업트리) 기준** — 커밋/깃허브 아님. 측정 대상은 브랜딩만 제거한 라인 유사도라, 높을수록 sangwoo 복붙 흔적이 남은 것.

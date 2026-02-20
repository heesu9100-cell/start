# CLAUDE.md - AI 법제관 (법률안 자구점검 도구)

## 프로젝트 개요

법률안의 용어, 체계, 형식, 헌법 정합성을 AI로 종합 점검하는 웹 기반 자구점검 도구.

- **프로젝트명**: AI 법제관
- **목적**: 법률안 초안의 자구점검을 자동화하여 법제 실무자의 검토를 지원
- **사용자**: 법제처 실무자, 국회 입법조사관, 법률안 기초자
- **플랫폼**: 웹 (데스크톱 중심)

## 기술 스택

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **AI/LLM**: Claude API (Anthropic) — 자구점검 분석 엔진
- **State**: React hooks + Context (필요 시 Zustand)
- **Package Manager**: npm

## 핵심 기능

### 1. 법률안 입력
- 텍스트 직접 입력 (에디터)
- 파일 업로드 (HWP, DOCX, PDF, TXT)
- 조문 단위 자동 파싱 (제○조, 제○항, 제○호 구조 인식)

### 2. 용어 점검
- 법령용어 오용/혼용 검출 (예: "~할 수 있다" vs "~하여야 한다")
- 한글맞춤법 및 법률 표기 규칙 검사
- 동일 법률안 내 용어 일관성 검사
- 법제처 「법령 입안 심사 기준」 기반 점검

### 3. 체계 점검
- 조문 번호 연속성 검사 (누락, 중복)
- 인용 조문 존재 여부 확인 (내부 참조)
- 위임 근거 조문과 하위법령 정합성
- 장/절/조/항/호/목 체계 적정성 검사

### 4. 형식 점검
- 제명(법률명) 작성 규칙 준수 여부
- 부칙 형식 점검 (시행일, 경과조치, 다른 법률 개정)
- 별표/서식 참조 형식 검사
- 법률안 표준 양식 준수 여부

### 5. 헌법 정합성 점검
- 기본권 제한 법률의 과잉금지원칙 검토
- 포괄위임입법금지 원칙 위반 가능성 검토
- 평등원칙, 적법절차, 소급입법금지 등 위반 소지 검출
- 관련 헌법재판소 판례 참조 제시

### 6. 점검 결과 리포트
- 항목별 점검 결과 (통과/경고/오류) 표시
- 수정 제안 및 근거 조문/판례 제시
- PDF/DOCX 리포트 내보내기

## 프로젝트 구조 (목표)

```
/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 메인 페이지 (법률안 입력)
│   ├── review/
│   │   └── page.tsx            # 점검 결과 페이지
│   └── api/
│       ├── check/
│       │   └── route.ts        # 자구점검 API 엔드포인트
│       └── parse/
│           └── route.ts        # 법률안 파싱 API
├── src/
│   ├── components/             # UI 컴포넌트
│   │   ├── Editor.tsx          # 법률안 입력 에디터
│   │   ├── ResultPanel.tsx     # 점검 결과 패널
│   │   ├── CheckItem.tsx       # 개별 점검 항목
│   │   └── ReportExport.tsx    # 리포트 내보내기
│   ├── lib/
│   │   ├── parser.ts           # 법률안 조문 파서
│   │   ├── checker/
│   │   │   ├── terminology.ts  # 용어 점검 로직
│   │   │   ├── structure.ts    # 체계 점검 로직
│   │   │   ├── format.ts       # 형식 점검 로직
│   │   │   └── constitution.ts # 헌법 정합성 점검 로직
│   │   ├── ai.ts               # Claude API 호출 래퍼
│   │   └── report.ts           # 리포트 생성
│   ├── data/
│   │   ├── legal-terms.ts      # 법령용어 사전/규칙
│   │   └── rules.ts            # 점검 규칙 정의
│   └── types/
│       └── index.ts            # TypeScript 타입 정의
├── public/                     # 정적 파일
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                  # API 키 (ANTHROPIC_API_KEY)
```

## 핵심 데이터 타입

```typescript
// 법률안 조문 구조
type ArticleType = 'chapter' | 'section' | 'article' | 'paragraph' | 'subparagraph' | 'item';

interface Article {
  id: string;
  type: ArticleType;
  number: string;         // "제1조", "제2항" 등
  content: string;
  children?: Article[];
}

interface BillDocument {
  title: string;          // 법률안 제명
  proposer?: string;      // 발의자
  articles: Article[];    // 조문 목록
  addenda?: Article[];    // 부칙
  rawText: string;
}

// 점검 결과
type CheckSeverity = 'error' | 'warning' | 'info' | 'pass';
type CheckCategory = 'terminology' | 'structure' | 'format' | 'constitution';

interface CheckResult {
  id: string;
  category: CheckCategory;
  severity: CheckSeverity;
  articleRef: string;     // 해당 조문 위치
  message: string;        // 점검 결과 메시지
  suggestion?: string;    // 수정 제안
  legalBasis?: string;    // 근거 (법제처 기준, 헌법 조문, 판례 등)
}

interface ReviewReport {
  bill: BillDocument;
  results: CheckResult[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    passed: number;
  };
  checkedAt: Date;
}
```

## 개발 명령어

```bash
npm install            # 의존성 설치
npm run dev            # 개발 서버 (http://localhost:3000)
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 서버
npm run lint           # ESLint 실행
npm run type-check     # TypeScript 타입 체크
```

## 코딩 컨벤션

- **언어**: TypeScript strict 모드
- **UI 텍스트**: 한국어
- **컴포넌트**: 함수형 컴포넌트 + hooks, PascalCase 파일명
- **API Routes**: Next.js App Router의 Route Handlers 사용
- **스타일**: Tailwind CSS 유틸리티 클래스
- **AI 호출**: 모든 LLM 호출은 서버 사이드(API Route)에서만 수행 (API 키 노출 방지)
- **에러 처리**: AI 응답은 반드시 구조화된 JSON으로 파싱, 실패 시 사용자에게 명확한 피드백
- **법률 용어**: 법제처 「법령 입안 심사 기준」을 기준으로 용어 통일

## 환경 변수

```
ANTHROPIC_API_KEY=     # Claude API 키 (필수, 서버 사이드 전용)
```

`.env.local`에 설정. 절대 클라이언트에 노출하지 않는다.

## 현재 상태

기존 코드베이스는 헌법 OX 퀴즈 앱(React Native/Expo) MVP이며, AI 법제관 프로젝트로 전환 예정. 기존 `src/` 내 헌법 관련 데이터(조문, 판례 참조 구조)는 헌법 정합성 점검 기능 개발 시 참고 가능.

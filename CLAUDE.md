# CLAUDE.md - 헌법 OX 퀴즈 (Constitution OX Quiz)

## Project Overview

A mobile quiz application for studying the Korean Constitution, targeting civil service exam candidates, legislative exam candidates, and bar exam candidates. Built with React Native and Expo.

- **App Name**: 헌법 OX (Constitution OX)
- **Package**: `constitution-ox-quiz`
- **Platform Targets**: iOS, Android, Web
- **Language**: TypeScript (strict mode)

## Tech Stack

- **Framework**: React Native 0.81.5 with Expo ~54.0.25
- **Navigation**: React Navigation (native-stack v7)
- **Storage**: AsyncStorage (declared, not yet used)
- **TypeScript**: ~5.9.2 with strict mode (`tsconfig.json` extends `expo/tsconfig.base`)

## Project Structure

```
/
├── App.tsx                     # Root component, navigation setup (NativeStackNavigator)
├── index.ts                    # Entry point (registerRootComponent)
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (strict mode)
├── assets/                     # App icons, splash screen images
└── src/
    ├── data/
    │   └── questions.ts        # Question bank and utility functions
    ├── screens/
    │   ├── HomeScreen.tsx      # Exam type selection screen
    │   ├── QuizScreen.tsx      # Quiz gameplay screen (OX True/False)
    │   ├── ResultScreen.tsx    # Results with scores and explanations
    │   └── index.ts            # Barrel export for screens
    └── types/
        └── index.ts            # TypeScript interfaces (ExamType, Question, QuizSession, QuizResult)
```

## Development Commands

```bash
npm start          # Start Expo development server
npm run android    # Start on Android emulator/device
npm run ios        # Start on iOS simulator/device
npm run web        # Start in web browser
```

**Note**: Run `npm install` before first use — dependencies are not committed.

## Architecture

### Navigation Flow

```
HomeScreen → QuizScreen → ResultScreen
                              ↓
                         (다시 풀기 → QuizScreen)
                         (홈으로 → HomeScreen)
```

- Uses `@react-navigation/native-stack` with `NativeStackNavigator`
- `RootStackParamList` type defined in `App.tsx` (also duplicated in each screen file)
- Navigation params pass `examType`, `answers`, and `questionIds` between screens

### Data Model

**Exam Types** (`ExamType`): `'grade5'` | `'legislative'` | `'bar'`
- grade5: 5급공채 헌법 (Grade 5 Civil Service Exam)
- legislative: 입법고시 헌법 (Legislative High Exam)
- bar: 변호사시험 헌법 (Bar Exam)

**Question structure**: Each question has `id`, `examType`, optional `year`/`questionNumber`, `content` (statement), `answer` (boolean: true=O, false=X), and `explanation` with constitutional article refs and/or court precedent refs.

**Current data**: 15 sample questions (5 per exam type) in `src/data/questions.ts`.

### Utility Functions

- `getQuestionsByExamType(examType)` — Filters questions by exam type
- `shuffleQuestions(questions)` — Fisher-Yates shuffle

### Styling

- React Native `StyleSheet` API (no external styling libraries)
- Color palette:
  - Primary blue: `#4299E1`
  - Dark blue: `#1A365D`
  - Green (correct/O): `#48BB78`, `#2F855A`
  - Red (wrong/X): `#FC8181`, `#C53030`
  - Background: `#F5F7FA`
  - Card: `#FFFFFF`
  - Text grays: `#4A5568`, `#718096`
- Portrait-only orientation, light UI style

## Conventions

- All UI text is in Korean
- Component files use PascalCase (e.g., `HomeScreen.tsx`)
- Default exports for screen components
- Barrel exports via `index.ts` files
- Inline styles via `StyleSheet.create()` at the bottom of each component file
- Functional components with hooks (no class components)
- Questions use OX (True/False) format — `true` = O (correct), `false` = X (incorrect)

## Known Gaps

- No testing framework configured
- No linting/formatting tools (no ESLint, Prettier)
- No CI/CD pipeline
- AsyncStorage imported in dependencies but not used in code yet
- `RootStackParamList` type is duplicated across screen files instead of imported from `App.tsx`
- No persistent data storage for quiz history/progress

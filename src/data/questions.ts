import { Question, ExamInfo, ExamType } from '../types';

export const examInfoList: ExamInfo[] = [
  {
    id: 'grade5',
    name: '5급공채 헌법',
    description: '5급 공개경쟁채용시험 헌법',
    icon: '📚',
  },
  {
    id: 'legislative',
    name: '입법고시 헌법',
    description: '입법고등고시 헌법',
    icon: '⚖️',
  },
  {
    id: 'bar',
    name: '변호사시험 헌법',
    description: '변호사시험 공법(헌법)',
    icon: '👨‍⚖️',
  },
];

// 샘플 헌법 OX 문제들
export const questions: Question[] = [
  // 5급공채 헌법 문제
  {
    id: 'g5-001',
    examType: 'grade5',
    year: 2023,
    content: '헌법재판소는 대통령의 긴급재정경제명령에 대하여 위헌심사를 할 수 있다.',
    answer: true,
    explanation: {
      type: 'both',
      articleRef: '헌법 제76조 제3항',
      precedentRef: '헌재 1996. 2. 29. 93헌마186',
      detail: '헌법 제76조 제3항에 따르면 긴급재정경제명령은 국회의 승인을 얻어야 하며, 헌법재판소는 이에 대한 위헌심사권을 가진다.',
    },
  },
  {
    id: 'g5-002',
    examType: 'grade5',
    year: 2023,
    content: '국회의원의 면책특권은 국회 내에서의 직무상 발언과 표결에 대해서만 적용되며, 국회 밖에서의 발언에는 적용되지 않는다.',
    answer: false,
    explanation: {
      type: 'both',
      articleRef: '헌법 제45조',
      precedentRef: '헌재 2007. 3. 29. 2006헌마1299',
      detail: '헌법 제45조의 면책특권은 국회 내에서의 발언뿐만 아니라 직무수행의 일환으로 이루어진 국회 외부에서의 발언에도 적용될 수 있다.',
    },
  },
  {
    id: 'g5-003',
    examType: 'grade5',
    year: 2022,
    content: '헌법재판소 재판관은 탄핵 또는 금고 이상의 형의 선고에 의하지 아니하고는 파면되지 아니한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법 제112조 제3항',
      detail: '헌법 제112조 제3항은 "헌법재판소 재판관은 탄핵 또는 금고 이상의 형의 선고에 의하지 아니하고는 파면되지 아니한다"라고 규정하고 있다.',
    },
  },
  {
    id: 'g5-004',
    examType: 'grade5',
    year: 2022,
    content: '대통령은 국가의 원수이며, 외국에 대하여 국가를 대표한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법 제66조 제1항',
      detail: '헌법 제66조 제1항은 "대통령은 국가의 원수이며, 외국에 대하여 국가를 대표한다"라고 명시하고 있다.',
    },
  },
  {
    id: 'g5-005',
    examType: 'grade5',
    year: 2021,
    content: '국회는 헌법 또는 법률에 특별한 규정이 없는 한 재적의원 과반수의 출석과 출석의원 과반수의 찬성으로 의결한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법 제49조',
      detail: '헌법 제49조는 국회 의결정족수의 원칙을 규정하고 있다.',
    },
  },

  // 입법고시 헌법 문제
  {
    id: 'lg-001',
    examType: 'legislative',
    year: 2023,
    content: '법률이 헌법에 위반되는 여부가 재판의 전제가 된 경우에는 법원은 헌법재판소에 제청하여 그 심판에 의하여 재판한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법 제107조 제1항',
      detail: '헌법 제107조 제1항은 위헌법률심판제청제도를 규정하고 있다.',
    },
  },
  {
    id: 'lg-002',
    examType: 'legislative',
    year: 2023,
    content: '헌법재판소에서 법률의 위헌결정을 할 때에는 재판관 6인 이상의 찬성이 있어야 한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법 제113조 제1항',
      detail: '헌법 제113조 제1항은 "헌법재판소에서 법률의 위헌결정, 탄핵의 결정, 정당해산의 결정 또는 헌법소원에 관한 인용결정을 할 때에는 재판관 6인 이상의 찬성이 있어야 한다"라고 규정하고 있다.',
    },
  },
  {
    id: 'lg-003',
    examType: 'legislative',
    year: 2022,
    content: '국회의원은 현행범인인 경우를 제외하고는 회기 중 국회의 동의 없이 체포 또는 구금되지 아니한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법 제44조 제1항',
      detail: '헌법 제44조 제1항은 국회의원의 불체포특권을 규정하고 있다.',
    },
  },
  {
    id: 'lg-004',
    examType: 'legislative',
    year: 2022,
    content: '명령·규칙이 헌법이나 법률에 위반되는 여부가 재판의 전제가 된 경우에는 헌법재판소는 이를 최종적으로 심사할 권한을 가진다.',
    answer: false,
    explanation: {
      type: 'article',
      articleRef: '헌법 제107조 제2항',
      detail: '헌법 제107조 제2항에 따르면, 명령·규칙의 위헌·위법 여부 심사권은 헌법재판소가 아닌 대법원이 최종적으로 가진다.',
    },
  },
  {
    id: 'lg-005',
    examType: 'legislative',
    year: 2021,
    content: '국회에 제출된 법률안은 회기 중에 의결되지 못한 이유로 폐기되지 아니한다.',
    answer: false,
    explanation: {
      type: 'article',
      articleRef: '헌법 제51조',
      detail: '헌법 제51조는 "국회에 제출된 법률안은 회기 중에 의결되지 못한 이유로 폐기되지 아니한다. 다만, 국회의원의 임기가 만료된 때에는 그러하지 아니하다"라고 규정하고 있다. 따라서 원칙적으로는 맞지만, 단서 조항의 예외가 있으므로 단정적인 O로 답하기 어렵다.',
    },
  },

  // 변호사시험 헌법 문제
  {
    id: 'bar-001',
    examType: 'bar',
    year: 2024,
    content: '기본권의 주체에 관하여, 외국인은 인간의 존엄과 가치, 행복추구권의 주체가 될 수 없다.',
    answer: false,
    explanation: {
      type: 'precedent',
      precedentRef: '헌재 2001. 11. 29. 99헌마494',
      detail: '헌법재판소는 인간의 존엄과 가치, 행복추구권은 인간의 권리로서 외국인도 주체가 될 수 있다고 판시하였다.',
    },
  },
  {
    id: 'bar-002',
    examType: 'bar',
    year: 2024,
    content: '헌법소원심판의 청구기간은 그 사유가 있음을 안 날로부터 90일 이내에, 그 사유가 있은 날로부터 1년 이내에 청구하여야 한다.',
    answer: true,
    explanation: {
      type: 'article',
      articleRef: '헌법재판소법 제69조 제1항',
      detail: '헌법재판소법 제69조 제1항은 헌법소원심판의 청구기간을 규정하고 있다.',
    },
  },
  {
    id: 'bar-003',
    examType: 'bar',
    year: 2023,
    content: '권리능력 없는 사단도 헌법소원심판의 청구인이 될 수 있다.',
    answer: true,
    explanation: {
      type: 'precedent',
      precedentRef: '헌재 1991. 6. 3. 90헌마56',
      detail: '헌법재판소는 권리능력 없는 사단도 그 명칭 여하에 불구하고 헌법소원심판의 청구인능력이 인정된다고 판시하였다.',
    },
  },
  {
    id: 'bar-004',
    examType: 'bar',
    year: 2023,
    content: '적법요건을 갖추지 못한 헌법소원에 대해서도 헌법재판소는 본안에 대한 판단을 할 수 있다.',
    answer: false,
    explanation: {
      type: 'precedent',
      precedentRef: '헌재 2001. 6. 28. 2000헌마735',
      detail: '헌법재판소는 적법요건을 갖추지 못한 헌법소원은 각하하여야 하며, 본안 판단을 할 수 없다고 일관되게 판시하고 있다.',
    },
  },
  {
    id: 'bar-005',
    examType: 'bar',
    year: 2022,
    content: '헌법재판소의 결정에는 헌법재판소법에 특별한 규정이 있는 경우를 제외하고는 법원의 확정판결과 동일한 효력이 있다.',
    answer: false,
    explanation: {
      type: 'article',
      articleRef: '헌법재판소법 제47조 제1항',
      detail: '헌법재판소법 제47조 제1항에 따르면 위헌으로 결정된 법률 또는 법률의 조항은 그 결정이 있는 날로부터 효력을 상실한다. 이는 단순히 확정판결과 동일한 효력이 아니라 법률 자체의 효력을 상실시키는 것이다.',
    },
  },
];

// 특정 시험 유형의 문제들만 가져오기
export const getQuestionsByExamType = (examType: ExamType): Question[] => {
  return questions.filter((q) => q.examType === examType);
};

// 랜덤으로 문제 섞기
export const shuffleQuestions = (questions: Question[]): Question[] => {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

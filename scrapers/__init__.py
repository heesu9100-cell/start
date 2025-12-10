"""
한국 법률 정보 스크래퍼 패키지
Korean Legal Information Scrapers

이 패키지는 다음 소스에서 한국 법률 관련 데이터를 수집합니다:

1. 헌법재판소 (Constitutional Court)
   - 헌법재판소 결정례 크롤링
   - 오픈API: https://openapi.ccourt.go.kr/

2. 국가법령정보센터 (Law Info Center)
   - 헌법 및 법령 크롤링
   - 오픈API: https://open.law.go.kr/

3. 사이버국가고시센터 (Gosi Center)
   - 5급, 7급, 9급 공무원 헌법 기출문제 크롤링
   - 사이트: https://www.gosi.kr/

4. 법무부 (Ministry of Justice)
   - 변호사시험 기출문제 크롤링
   - 사이트: https://www.moj.go.kr/

5. 국회채용시스템 (Assembly Exam)
   - 입법고시, 8급 헌법 기출문제 크롤링
   - 사이트: https://gosi.assembly.go.kr/

6. 대법원 채용 (Court Exam)
   - 법원행시, 9급 헌법 기출문제 크롤링
   - 사이트: https://exam.scourt.go.kr/

사용 예시:
    >>> from scrapers import KoreanLegalScraper
    >>> scraper = KoreanLegalScraper()
    >>> results = scraper.search_all("기본권")
"""

from .constitutional_court import (
    ConstitutionalCourtScraper,
    ConstitutionalDecision,
    search_constitutional_decisions,
    get_decisions_by_article,
)

from .law_info_center import (
    LawInfoCenterScraper,
    LawInfo,
    ConstitutionArticle,
    get_constitution,
    search_laws,
    get_constitution_article_text,
)

from .gosi_center import (
    GosiCenterScraper,
    ExamQuestion,
    get_constitution_exam_list,
    download_constitution_exams,
)

from .bar_exam import (
    BarExamScraper,
    BarExamQuestion,
    get_bar_exam_list,
    get_constitution_bar_exams,
    download_bar_exam,
)

from .assembly_exam import (
    AssemblyExamScraper,
    LegislativeExamQuestion,
    get_legislative_exam_list,
    get_grade8_exam_list,
    search_assembly_exams,
)

from .court_exam import (
    CourtExamScraper,
    CourtExamQuestion,
    get_court_exam_list,
    get_all_court_exams,
    get_court_exam_subjects,
)

# 패키지 버전
__version__ = "1.0.0"

# 모든 스크래퍼 클래스
__all__ = [
    # 헌법재판소
    "ConstitutionalCourtScraper",
    "ConstitutionalDecision",
    "search_constitutional_decisions",
    "get_decisions_by_article",

    # 국가법령정보센터
    "LawInfoCenterScraper",
    "LawInfo",
    "ConstitutionArticle",
    "get_constitution",
    "search_laws",
    "get_constitution_article_text",

    # 사이버국가고시센터
    "GosiCenterScraper",
    "ExamQuestion",
    "get_constitution_exam_list",
    "download_constitution_exams",

    # 변호사시험
    "BarExamScraper",
    "BarExamQuestion",
    "get_bar_exam_list",
    "get_constitution_bar_exams",
    "download_bar_exam",

    # 국회채용시스템
    "AssemblyExamScraper",
    "LegislativeExamQuestion",
    "get_legislative_exam_list",
    "get_grade8_exam_list",
    "search_assembly_exams",

    # 대법원 채용
    "CourtExamScraper",
    "CourtExamQuestion",
    "get_court_exam_list",
    "get_all_court_exams",
    "get_court_exam_subjects",

    # 통합 스크래퍼
    "KoreanLegalScraper",
]


class KoreanLegalScraper:
    """
    통합 한국 법률 정보 스크래퍼

    모든 소스에서 법률 데이터를 통합적으로 검색하고 수집합니다.

    Example:
        >>> scraper = KoreanLegalScraper()
        >>> results = scraper.search_all("기본권")
        >>> constitution = scraper.get_constitution_full()
    """

    def __init__(self, api_key: str = None, download_dir: str = "./downloads"):
        """
        Args:
            api_key: 공공데이터포털 API 키 (선택)
            download_dir: 파일 다운로드 디렉토리
        """
        self.api_key = api_key
        self.download_dir = download_dir

        # 각 스크래퍼 인스턴스 생성
        self.constitutional_court = ConstitutionalCourtScraper(api_key)
        self.law_info_center = LawInfoCenterScraper(api_key)
        self.gosi_center = GosiCenterScraper(download_dir)
        self.bar_exam = BarExamScraper(f"{download_dir}/bar_exam")
        self.assembly_exam = AssemblyExamScraper(f"{download_dir}/assembly_exam")
        self.court_exam = CourtExamScraper(f"{download_dir}/court_exam")

    def search_all(self, query: str) -> dict:
        """
        모든 소스에서 통합 검색

        Args:
            query: 검색어

        Returns:
            각 소스별 검색 결과 딕셔너리
        """
        results = {
            'constitutional_decisions': [],
            'laws': [],
            'civil_service_exams': [],
            'bar_exams': [],
            'legislative_exams': [],
            'court_exams': [],
        }

        # 헌법재판소 결정례 검색
        try:
            cc_results = self.constitutional_court.search_via_law_go_kr(query)
            if 'decisions' in cc_results:
                results['constitutional_decisions'] = cc_results['decisions']
        except Exception:
            pass

        # 법령 검색
        try:
            law_results = self.law_info_center.search_laws(query)
            if 'laws' in law_results:
                results['laws'] = law_results['laws']
        except Exception:
            pass

        # 공무원 시험 검색
        try:
            gosi_results = self.gosi_center.search_exams(query)
            if 'exams' in gosi_results:
                results['civil_service_exams'] = gosi_results['exams']
        except Exception:
            pass

        return results

    def get_constitution_full(self) -> dict:
        """
        대한민국 헌법 전문 조회

        Returns:
            헌법 전문 및 조문 목록
        """
        return self.law_info_center.get_constitution()

    def get_constitution_article(self, article_no: int) -> str:
        """
        헌법 특정 조문 조회

        Args:
            article_no: 조문 번호

        Returns:
            조문 내용
        """
        article = self.law_info_center.get_constitution_article(article_no)
        if article:
            return article.article_content
        return ""

    def get_all_constitution_exams(self, start_year: int = 2015) -> dict:
        """
        모든 헌법 기출문제 조회

        Args:
            start_year: 시작 년도

        Returns:
            시험 유형별 기출문제 목록
        """
        return {
            'civil_service_5grade': self.gosi_center.get_grade5_constitution_exams(start_year),
            'civil_service_7grade': self.gosi_center.get_grade7_constitution_exams(start_year),
            'civil_service_9grade': self.gosi_center.get_grade9_constitution_exams(start_year),
            'bar_exam': self.bar_exam.get_constitution_exams(),
            'legislative_exam': self.assembly_exam.get_legislative_exam_questions(start_year),
            'assembly_8grade': self.assembly_exam.get_grade8_exam_questions(start_year),
            'court_9grade': self.court_exam.get_grade9_constitution_exams(start_year),
            'court_haengsi': self.court_exam.get_court_haengsi_exams(start_year),
        }

    def get_recent_decisions(self, days: int = 30) -> list:
        """
        최근 헌법재판소 결정례 조회

        Args:
            days: 최근 며칠간의 결정례

        Returns:
            결정례 목록
        """
        result = self.constitutional_court.get_recent_decisions(days)
        return result.get('decisions', [])

    def search_decisions_by_article(self, article: str) -> list:
        """
        헌법 조문별 결정례 검색

        Args:
            article: 헌법 조문 (예: "제10조", "제37조제2항")

        Returns:
            관련 결정례 목록
        """
        result = self.constitutional_court.search_by_article(article)
        return result.get('decisions', [])

    def get_summary(self) -> dict:
        """
        전체 데이터 요약 정보

        Returns:
            요약 정보 딕셔너리
        """
        return {
            'sources': [
                '헌법재판소 (openapi.ccourt.go.kr)',
                '국가법령정보센터 (open.law.go.kr)',
                '사이버국가고시센터 (gosi.kr)',
                '법무부 (moj.go.kr)',
                '국회채용시스템 (gosi.assembly.go.kr)',
                '대법원 채용 (exam.scourt.go.kr)',
            ],
            'exam_types': [
                '5급 공채 헌법',
                '7급 공채 헌법',
                '9급 공채 헌법',
                '변호사시험 공법(헌법)',
                '입법고시 헌법',
                '8급 국회직 헌법',
                '법원행시 헌법',
                '법원직 9급 헌법',
            ],
            'data_types': [
                '헌법재판소 결정례',
                '헌법 조문',
                '법령 정보',
                '기출문제 (선택형/사례형/기록형)',
                '정답지',
            ]
        }

    def export_all_to_json(self, output_dir: str = "./output"):
        """
        모든 데이터를 JSON으로 내보내기

        Args:
            output_dir: 출력 디렉토리
        """
        import os
        os.makedirs(output_dir, exist_ok=True)

        # 헌법 저장
        constitution = self.get_constitution_full()
        with open(f"{output_dir}/constitution.json", 'w', encoding='utf-8') as f:
            import json
            json.dump(constitution, f, ensure_ascii=False, indent=2)

        # 요약 정보 저장
        summary = self.get_summary()
        with open(f"{output_dir}/summary.json", 'w', encoding='utf-8') as f:
            import json
            json.dump(summary, f, ensure_ascii=False, indent=2)

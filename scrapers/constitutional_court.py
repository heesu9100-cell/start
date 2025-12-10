"""
헌법재판소 결정례 크롤러
Constitutional Court of Korea Decision Scraper

공식 오픈API: https://openapi.ccourt.go.kr/
대체 소스: 국가법령정보센터 API
"""

import requests
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import json
import time
import urllib.parse


@dataclass
class ConstitutionalDecision:
    """헌법재판소 결정례 데이터 클래스"""
    case_no: str  # 사건번호 (예: 2021헌마1234)
    case_name: str  # 사건명
    decision_date: str  # 선고일자
    decision_type: str  # 결정유형 (위헌, 합헌, 기각 등)
    case_type: str  # 사건종류 (헌마, 헌바, 헌가 등)
    summary: str  # 결정요지
    full_text: Optional[str] = None  # 전문
    related_laws: Optional[List[str]] = None  # 관련법령


class ConstitutionalCourtScraper:
    """
    헌법재판소 결정례 스크래퍼

    사용 가능한 소스:
    1. 헌법재판소 공식 오픈API (openapi.ccourt.go.kr)
    2. 국가법령정보센터 API (open.law.go.kr)
    """

    # 헌법재판소 검색 페이지 (웹 크롤링용)
    CCOURT_SEARCH_URL = "https://search.ccourt.go.kr/ths/pr/ths_pr0101_L1.do"

    # 국가법령정보센터 API (공공데이터포털)
    LAW_GO_KR_API_URL = "http://www.law.go.kr/DRF/lawSearch.do"

    # 공공데이터포털 API
    DATA_GO_KR_API_URL = "http://apis.data.go.kr/1170000/law"

    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: 공공데이터포털 API 키 (선택사항)
        """
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def search_via_law_go_kr(
        self,
        query: str = "",
        case_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        국가법령정보센터 API를 통한 헌재결정례 검색

        Args:
            query: 검색어
            case_type: 사건유형 (헌가, 헌나, 헌다, 헌라, 헌마, 헌바, 헌사, 헌아)
            start_date: 시작일 (YYYYMMDD)
            end_date: 종료일 (YYYYMMDD)
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        params = {
            'OC': 'chetera',  # 사용자 ID (기본값)
            'target': 'prec',  # 판례
            'type': 'XML',
            'mobileYn': 'N',
            'query': query,
            'display': page_size,
            'page': page,
            'sort': 'ddes',  # 선고일 내림차순
            'precKind': '헌재결정',  # 헌법재판소 결정만
        }

        if case_type:
            params['caseNm'] = case_type
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date

        try:
            response = self.session.get(
                self.LAW_GO_KR_API_URL,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_law_go_kr_response(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'decisions': []}

    def search_via_data_go_kr(
        self,
        query: str = "",
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        공공데이터포털 API를 통한 헌재결정례 검색
        (API 키 필요)

        Args:
            query: 검색어
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        if not self.api_key:
            return {'error': 'API key required for data.go.kr', 'decisions': []}

        params = {
            'serviceKey': self.api_key,
            'numOfRows': page_size,
            'pageNo': page,
            'type': 'json'
        }

        if query:
            params['query'] = query

        try:
            response = self.session.get(
                f"{self.DATA_GO_KR_API_URL}/constSearchList.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'error': str(e), 'decisions': []}

    def get_decision_detail(self, decision_id: str) -> Optional[ConstitutionalDecision]:
        """
        결정례 상세 정보 조회

        Args:
            decision_id: 결정례 ID 또는 사건번호

        Returns:
            ConstitutionalDecision 객체 또는 None
        """
        params = {
            'OC': 'chetera',
            'target': 'prec',
            'type': 'XML',
            'ID': decision_id,
        }

        try:
            response = self.session.get(
                self.LAW_GO_KR_API_URL,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_decision_detail(response.text)
        except requests.RequestException:
            return None

    def search_by_article(
        self,
        constitution_article: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        헌법 조문별 결정례 검색

        Args:
            constitution_article: 헌법 조문 (예: "제10조", "제37조제2항")
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        query = f"헌법 {constitution_article}"
        return self.search_via_law_go_kr(
            query=query,
            page=page,
            page_size=page_size
        )

    def search_by_case_type(
        self,
        case_type: str,
        year: Optional[int] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        사건유형별 결정례 검색

        Args:
            case_type: 사건유형
                - '헌가': 위헌법률심판
                - '헌나': 탄핵심판
                - '헌다': 정당해산심판
                - '헌라': 권한쟁의심판
                - '헌마': 헌법소원심판 (공권력 행사/불행사)
                - '헌바': 헌법소원심판 (위헌심사형)
                - '헌사': 규칙심판
                - '헌아': 특별심판
            year: 연도 (선택)
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        query = case_type
        if year:
            query = f"{year}{case_type}"
        return self.search_via_law_go_kr(
            query=query,
            case_type=case_type,
            page=page,
            page_size=page_size
        )

    def get_recent_decisions(
        self,
        days: int = 30,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        최근 결정례 조회

        Args:
            days: 최근 며칠간의 결정례
            page_size: 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        from datetime import timedelta

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        return self.search_via_law_go_kr(
            start_date=start_date.strftime('%Y%m%d'),
            end_date=end_date.strftime('%Y%m%d'),
            page_size=page_size
        )

    def _parse_law_go_kr_response(self, xml_text: str) -> Dict[str, Any]:
        """
        국가법령정보센터 XML 응답 파싱
        """
        import xml.etree.ElementTree as ET

        try:
            root = ET.fromstring(xml_text)

            total_count = root.findtext('.//totalCnt', '0')
            decisions = []

            for prec in root.findall('.//prec'):
                decision = ConstitutionalDecision(
                    case_no=prec.findtext('사건번호', ''),
                    case_name=prec.findtext('사건명', ''),
                    decision_date=prec.findtext('선고일자', ''),
                    decision_type=prec.findtext('결정유형', ''),
                    case_type=prec.findtext('사건종류', ''),
                    summary=prec.findtext('판례요지', ''),
                    full_text=prec.findtext('판례내용', None),
                    related_laws=self._extract_related_laws(prec)
                )
                decisions.append(asdict(decision))

            return {
                'total_count': int(total_count),
                'decisions': decisions
            }
        except ET.ParseError as e:
            return {'error': f'XML parsing error: {e}', 'decisions': []}

    def _parse_decision_detail(self, xml_text: str) -> Optional[ConstitutionalDecision]:
        """
        결정례 상세 XML 파싱
        """
        import xml.etree.ElementTree as ET

        try:
            root = ET.fromstring(xml_text)
            prec = root.find('.//prec')

            if prec is None:
                return None

            return ConstitutionalDecision(
                case_no=prec.findtext('사건번호', ''),
                case_name=prec.findtext('사건명', ''),
                decision_date=prec.findtext('선고일자', ''),
                decision_type=prec.findtext('결정유형', ''),
                case_type=prec.findtext('사건종류', ''),
                summary=prec.findtext('판례요지', ''),
                full_text=prec.findtext('판례내용', None),
                related_laws=self._extract_related_laws(prec)
            )
        except ET.ParseError:
            return None

    def _extract_related_laws(self, prec_element) -> List[str]:
        """관련 법령 추출"""
        laws = []
        related = prec_element.find('참조조문')
        if related is not None and related.text:
            laws = [law.strip() for law in related.text.split(',')]
        return laws

    def export_to_json(self, decisions: List[Dict], filepath: str):
        """결정례 목록을 JSON 파일로 저장"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(decisions, f, ensure_ascii=False, indent=2)

    def export_to_csv(self, decisions: List[Dict], filepath: str):
        """결정례 목록을 CSV 파일로 저장"""
        import csv

        if not decisions:
            return

        fieldnames = decisions[0].keys()
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for decision in decisions:
                # 리스트 필드를 문자열로 변환
                row = {k: (', '.join(v) if isinstance(v, list) else v)
                       for k, v in decision.items()}
                writer.writerow(row)


# 편의 함수들
def search_constitutional_decisions(
    query: str = "",
    case_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    헌법재판소 결정례 검색 (편의 함수)

    Args:
        query: 검색어
        case_type: 사건유형 (헌가, 헌마, 헌바 등)
        page: 페이지 번호
        page_size: 페이지당 결과 수
        api_key: API 키 (선택)

    Returns:
        검색 결과 딕셔너리

    Example:
        >>> results = search_constitutional_decisions("기본권", case_type="헌마")
        >>> print(f"총 {results['total_count']}건")
    """
    scraper = ConstitutionalCourtScraper(api_key)
    return scraper.search_via_law_go_kr(
        query=query,
        case_type=case_type,
        page=page,
        page_size=page_size
    )


def get_decisions_by_article(
    article: str,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    헌법 조문별 결정례 검색 (편의 함수)

    Args:
        article: 헌법 조문 (예: "제10조", "제37조")
        api_key: API 키 (선택)

    Returns:
        검색 결과 딕셔너리

    Example:
        >>> results = get_decisions_by_article("제37조제2항")
    """
    scraper = ConstitutionalCourtScraper(api_key)
    return scraper.search_by_article(article)


if __name__ == "__main__":
    # 테스트 실행
    scraper = ConstitutionalCourtScraper()

    print("=== 헌법재판소 결정례 검색 테스트 ===\n")

    # 기본권 관련 결정례 검색
    print("1. '기본권' 키워드 검색:")
    results = scraper.search_via_law_go_kr(query="기본권", page_size=5)
    if 'error' not in results:
        print(f"   총 {results.get('total_count', 0)}건 검색됨")
        for d in results.get('decisions', [])[:3]:
            print(f"   - {d['case_no']}: {d['case_name'][:30]}...")
    else:
        print(f"   오류: {results['error']}")

    print("\n2. 헌법소원(헌마) 사건 검색:")
    results = scraper.search_by_case_type("헌마", year=2023, page_size=5)
    if 'error' not in results:
        print(f"   총 {results.get('total_count', 0)}건 검색됨")
        for d in results.get('decisions', [])[:3]:
            print(f"   - {d['case_no']}: {d['decision_type']}")
    else:
        print(f"   오류: {results['error']}")

"""
국가법령정보센터 크롤러
National Law Information Center Scraper

공식 오픈API: https://open.law.go.kr/
공공데이터포털: https://www.data.go.kr/data/15000115/openapi.do
"""

import requests
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
import json
import xml.etree.ElementTree as ET


@dataclass
class LawInfo:
    """법령 정보 데이터 클래스"""
    law_id: str  # 법령ID
    law_name: str  # 법령명
    law_name_korean: str  # 법령명(한글)
    law_type: str  # 법령종류 (헌법, 법률, 대통령령, 총리령, 부령 등)
    promulgation_date: str  # 공포일자
    promulgation_no: str  # 공포번호
    enforcement_date: str  # 시행일자
    ministry: str  # 소관부처
    law_status: str  # 현행/폐지 구분
    articles: Optional[List[Dict]] = None  # 조문 목록


@dataclass
class ConstitutionArticle:
    """헌법 조문 데이터 클래스"""
    article_no: str  # 조번호
    article_title: str  # 조제목
    article_content: str  # 조문내용
    paragraph_no: Optional[str] = None  # 항번호
    subparagraph_no: Optional[str] = None  # 호번호


class LawInfoCenterScraper:
    """
    국가법령정보센터 스크래퍼

    기능:
    - 헌법 전문 및 조문 조회
    - 법령 검색 및 상세 조회
    - 법령 해석례, 행정규칙 조회
    """

    # 국가법령정보센터 API 엔드포인트
    LAW_API_BASE = "http://www.law.go.kr/DRF"

    # 공공데이터포털 API
    DATA_GO_KR_BASE = "http://apis.data.go.kr/1170000/law"

    def __init__(self, api_key: Optional[str] = None, user_id: str = "chetera"):
        """
        Args:
            api_key: 공공데이터포털 API 키 (선택)
            user_id: 국가법령정보센터 사용자 ID (기본값: chetera)
        """
        self.api_key = api_key
        self.user_id = user_id
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    # ============== 헌법 관련 메서드 ==============

    def get_constitution(self) -> Dict[str, Any]:
        """
        대한민국 헌법 전문 조회

        Returns:
            헌법 정보 및 조문 목록
        """
        params = {
            'OC': self.user_id,
            'target': 'law',
            'type': 'XML',
            'MST': '헌법',
            'LID': '헌법',
        }

        try:
            response = self.session.get(
                f"{self.LAW_API_BASE}/lawService.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_law_detail(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def get_constitution_article(self, article_no: int) -> Optional[ConstitutionArticle]:
        """
        헌법 특정 조문 조회

        Args:
            article_no: 조문 번호 (예: 1, 10, 37)

        Returns:
            ConstitutionArticle 객체 또는 None
        """
        constitution = self.get_constitution()
        if 'error' in constitution:
            return None

        articles = constitution.get('articles', [])
        for article in articles:
            if str(article.get('article_no')) == str(article_no):
                return ConstitutionArticle(
                    article_no=article.get('article_no', ''),
                    article_title=article.get('article_title', ''),
                    article_content=article.get('article_content', '')
                )
        return None

    def get_all_constitution_articles(self) -> List[ConstitutionArticle]:
        """
        헌법 전체 조문 목록 조회

        Returns:
            ConstitutionArticle 객체 리스트
        """
        constitution = self.get_constitution()
        if 'error' in constitution:
            return []

        articles = []
        for article in constitution.get('articles', []):
            articles.append(ConstitutionArticle(
                article_no=article.get('article_no', ''),
                article_title=article.get('article_title', ''),
                article_content=article.get('article_content', ''),
                paragraph_no=article.get('paragraph_no'),
                subparagraph_no=article.get('subparagraph_no')
            ))
        return articles

    # ============== 법령 검색 메서드 ==============

    def search_laws(
        self,
        query: str,
        law_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        sort: str = 'date'
    ) -> Dict[str, Any]:
        """
        법령 검색

        Args:
            query: 검색어
            law_type: 법령종류 (헌법, 법률, 대통령령, 총리령, 부령)
            page: 페이지 번호
            page_size: 페이지당 결과 수
            sort: 정렬 기준 ('date': 공포일순, 'name': 법령명순)

        Returns:
            검색 결과 딕셔너리
        """
        params = {
            'OC': self.user_id,
            'target': 'law',
            'type': 'XML',
            'query': query,
            'display': page_size,
            'page': page,
            'sort': 'ddes' if sort == 'date' else 'efsc',
        }

        if law_type:
            params['gubun'] = self._get_law_type_code(law_type)

        try:
            response = self.session.get(
                f"{self.LAW_API_BASE}/lawSearch.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_law_search_result(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'laws': []}

    def get_law_detail(self, law_id: str) -> Dict[str, Any]:
        """
        법령 상세 정보 조회

        Args:
            law_id: 법령 ID 또는 법령명

        Returns:
            법령 상세 정보 딕셔너리
        """
        params = {
            'OC': self.user_id,
            'target': 'law',
            'type': 'XML',
            'MST': law_id,
        }

        try:
            response = self.session.get(
                f"{self.LAW_API_BASE}/lawService.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_law_detail(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def search_constitutional_laws(self, page_size: int = 50) -> Dict[str, Any]:
        """
        헌법 관련 법령 검색 (헌법재판소법 등)

        Returns:
            헌법 관련 법령 목록
        """
        return self.search_laws("헌법", page_size=page_size)

    # ============== 행정규칙 검색 ==============

    def search_administrative_rules(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        행정규칙 검색

        Args:
            query: 검색어
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        params = {
            'OC': self.user_id,
            'target': 'admrul',
            'type': 'XML',
            'query': query,
            'display': page_size,
            'page': page,
        }

        try:
            response = self.session.get(
                f"{self.LAW_API_BASE}/lawSearch.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_admin_rule_result(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'rules': []}

    # ============== 법령해석례 검색 ==============

    def search_law_interpretations(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        법령해석례 검색

        Args:
            query: 검색어
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        params = {
            'OC': self.user_id,
            'target': 'expc',
            'type': 'XML',
            'query': query,
            'display': page_size,
            'page': page,
        }

        try:
            response = self.session.get(
                f"{self.LAW_API_BASE}/lawSearch.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_interpretation_result(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'interpretations': []}

    # ============== 공공데이터포털 API ==============

    def search_via_data_go_kr(
        self,
        query: str = "",
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        공공데이터포털 API를 통한 법령 검색
        (API 키 필요)

        Args:
            query: 검색어
            page: 페이지 번호
            page_size: 페이지당 결과 수

        Returns:
            검색 결과 딕셔너리
        """
        if not self.api_key:
            return {'error': 'API key required', 'laws': []}

        params = {
            'serviceKey': self.api_key,
            'numOfRows': page_size,
            'pageNo': page,
            'type': 'json',
        }

        if query:
            params['query'] = query

        try:
            response = self.session.get(
                f"{self.DATA_GO_KR_BASE}/lawSearchList.do",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'error': str(e), 'laws': []}

    # ============== 내부 파싱 메서드 ==============

    def _parse_law_search_result(self, xml_text: str) -> Dict[str, Any]:
        """법령 검색 결과 XML 파싱"""
        try:
            root = ET.fromstring(xml_text)
            total_count = root.findtext('.//totalCnt', '0')
            laws = []

            for law in root.findall('.//law'):
                law_info = LawInfo(
                    law_id=law.findtext('법령ID', ''),
                    law_name=law.findtext('법령명', ''),
                    law_name_korean=law.findtext('법령명한글', ''),
                    law_type=law.findtext('법령종류', ''),
                    promulgation_date=law.findtext('공포일자', ''),
                    promulgation_no=law.findtext('공포번호', ''),
                    enforcement_date=law.findtext('시행일자', ''),
                    ministry=law.findtext('소관부처', ''),
                    law_status=law.findtext('현행여부', '현행')
                )
                laws.append(asdict(law_info))

            return {
                'total_count': int(total_count),
                'laws': laws
            }
        except ET.ParseError as e:
            return {'error': f'XML parsing error: {e}', 'laws': []}

    def _parse_law_detail(self, xml_text: str) -> Dict[str, Any]:
        """법령 상세 정보 XML 파싱"""
        try:
            root = ET.fromstring(xml_text)

            law_info = {
                'law_id': root.findtext('.//법령ID', ''),
                'law_name': root.findtext('.//법령명', ''),
                'law_type': root.findtext('.//법령종류', ''),
                'promulgation_date': root.findtext('.//공포일자', ''),
                'enforcement_date': root.findtext('.//시행일자', ''),
                'ministry': root.findtext('.//소관부처', ''),
                'preamble': root.findtext('.//전문', ''),
                'articles': []
            }

            # 조문 파싱
            for article in root.findall('.//조문'):
                article_data = {
                    'article_no': article.findtext('조문번호', ''),
                    'article_title': article.findtext('조문제목', ''),
                    'article_content': article.findtext('조문내용', ''),
                    'paragraphs': []
                }

                # 항 파싱
                for para in article.findall('항'):
                    para_data = {
                        'paragraph_no': para.findtext('항번호', ''),
                        'paragraph_content': para.findtext('항내용', ''),
                        'subparagraphs': []
                    }

                    # 호 파싱
                    for subpara in para.findall('호'):
                        subpara_data = {
                            'subparagraph_no': subpara.findtext('호번호', ''),
                            'subparagraph_content': subpara.findtext('호내용', '')
                        }
                        para_data['subparagraphs'].append(subpara_data)

                    article_data['paragraphs'].append(para_data)

                law_info['articles'].append(article_data)

            return law_info
        except ET.ParseError as e:
            return {'error': f'XML parsing error: {e}'}

    def _parse_admin_rule_result(self, xml_text: str) -> Dict[str, Any]:
        """행정규칙 검색 결과 파싱"""
        try:
            root = ET.fromstring(xml_text)
            total_count = root.findtext('.//totalCnt', '0')
            rules = []

            for rule in root.findall('.//admrul'):
                rule_info = {
                    'rule_id': rule.findtext('행정규칙ID', ''),
                    'rule_name': rule.findtext('행정규칙명', ''),
                    'rule_type': rule.findtext('행정규칙종류', ''),
                    'enforcement_date': rule.findtext('시행일자', ''),
                    'ministry': rule.findtext('소관부처', '')
                }
                rules.append(rule_info)

            return {
                'total_count': int(total_count),
                'rules': rules
            }
        except ET.ParseError as e:
            return {'error': f'XML parsing error: {e}', 'rules': []}

    def _parse_interpretation_result(self, xml_text: str) -> Dict[str, Any]:
        """법령해석례 검색 결과 파싱"""
        try:
            root = ET.fromstring(xml_text)
            total_count = root.findtext('.//totalCnt', '0')
            interpretations = []

            for interp in root.findall('.//expc'):
                interp_info = {
                    'interp_id': interp.findtext('법령해석례ID', ''),
                    'title': interp.findtext('안건명', ''),
                    'answer_date': interp.findtext('회답일자', ''),
                    'agency': interp.findtext('회답기관', ''),
                    'summary': interp.findtext('회답요지', '')
                }
                interpretations.append(interp_info)

            return {
                'total_count': int(total_count),
                'interpretations': interpretations
            }
        except ET.ParseError as e:
            return {'error': f'XML parsing error: {e}', 'interpretations': []}

    def _get_law_type_code(self, law_type: str) -> str:
        """법령 종류 코드 변환"""
        type_codes = {
            '헌법': '1',
            '법률': '2',
            '대통령령': '3',
            '총리령': '4',
            '부령': '5',
            '조약': '6',
        }
        return type_codes.get(law_type, '')

    # ============== 내보내기 메서드 ==============

    def export_constitution_to_json(self, filepath: str):
        """헌법 전문을 JSON으로 저장"""
        constitution = self.get_constitution()
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(constitution, f, ensure_ascii=False, indent=2)

    def export_to_json(self, data: Any, filepath: str):
        """데이터를 JSON으로 저장"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


# ============== 편의 함수 ==============

def get_constitution(api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    대한민국 헌법 조회 (편의 함수)

    Returns:
        헌법 정보 딕셔너리

    Example:
        >>> constitution = get_constitution()
        >>> for article in constitution['articles']:
        ...     print(f"제{article['article_no']}조: {article['article_title']}")
    """
    scraper = LawInfoCenterScraper(api_key)
    return scraper.get_constitution()


def search_laws(query: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    법령 검색 (편의 함수)

    Args:
        query: 검색어
        api_key: API 키 (선택)

    Returns:
        검색 결과 딕셔너리

    Example:
        >>> results = search_laws("헌법재판소")
        >>> print(f"총 {results['total_count']}건")
    """
    scraper = LawInfoCenterScraper(api_key)
    return scraper.search_laws(query)


def get_constitution_article_text(article_no: int) -> str:
    """
    헌법 특정 조문 텍스트 조회 (편의 함수)

    Args:
        article_no: 조문 번호

    Returns:
        조문 내용 문자열

    Example:
        >>> text = get_constitution_article_text(10)
        >>> print(text)  # "모든 국민은 인간으로서의 존엄과 가치를..."
    """
    scraper = LawInfoCenterScraper()
    article = scraper.get_constitution_article(article_no)
    if article:
        return article.article_content
    return ""


if __name__ == "__main__":
    # 테스트 실행
    scraper = LawInfoCenterScraper()

    print("=== 국가법령정보센터 크롤러 테스트 ===\n")

    # 헌법 조회
    print("1. 대한민국 헌법 조회:")
    constitution = scraper.get_constitution()
    if 'error' not in constitution:
        print(f"   법령명: {constitution.get('law_name', 'N/A')}")
        articles = constitution.get('articles', [])
        print(f"   조문 수: {len(articles)}개")
        if articles:
            print(f"   첫 번째 조문: 제{articles[0].get('article_no', '')}조")
    else:
        print(f"   오류: {constitution.get('error')}")

    # 법령 검색
    print("\n2. '헌법재판소' 관련 법령 검색:")
    results = scraper.search_laws("헌법재판소", page_size=5)
    if 'error' not in results:
        print(f"   총 {results.get('total_count', 0)}건 검색됨")
        for law in results.get('laws', [])[:3]:
            print(f"   - {law['law_name']} ({law['law_type']})")
    else:
        print(f"   오류: {results.get('error')}")

    # 법령해석례 검색
    print("\n3. '기본권' 법령해석례 검색:")
    results = scraper.search_law_interpretations("기본권", page_size=5)
    if 'error' not in results:
        print(f"   총 {results.get('total_count', 0)}건 검색됨")
        for interp in results.get('interpretations', [])[:3]:
            print(f"   - {interp['title'][:40]}...")
    else:
        print(f"   오류: {results.get('error')}")

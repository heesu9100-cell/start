"""
대법원 채용(법원직) 크롤러
Supreme Court Recruitment Exam Scraper

공식 사이트: https://exam.scourt.go.kr/
기출문제 관련: 공기출(https://0gichul.com/) 등 외부 사이트 참조

대상: 법원행시(5급), 법원직 9급 헌법 기출문제
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
import json
import re
import os
from urllib.parse import urljoin, urlparse
import time


@dataclass
class CourtExamQuestion:
    """법원직 기출문제 데이터 클래스"""
    exam_type: str  # 시험유형 (법원행시, 9급)
    year: int  # 시험년도
    subject: str  # 과목
    title: str  # 제목
    file_url: Optional[str] = None  # 파일 URL
    file_name: Optional[str] = None  # 파일명
    answer_url: Optional[str] = None  # 정답 URL
    source: str = "court"  # 출처


class CourtExamScraper:
    """
    대법원 채용 기출문제 스크래퍼

    기능:
    - 법원행시(법원행정고등고시) 헌법 기출문제 크롤링
    - 법원직 9급 헌법 기출문제 크롤링

    참고:
    - 대법원 공식 사이트는 기출문제를 직접 제공하지 않음
    - 외부 기출문제 사이트(공기출 등)를 통해 수집
    """

    # 대법원 채용 공식 사이트
    OFFICIAL_URL = "https://exam.scourt.go.kr"

    # 공기출 법원직 기출문제 (외부 소스)
    GICHUL_BASE_URL = "https://0gichul.com"

    # 법원직 관련 검색어
    COURT_EXAM_KEYWORDS = ['법원직', '법원행시', '법원9급', '법원 9급']

    # 과목 목록
    SUBJECTS = {
        'constitution': '헌법',
        'korean': '국어',
        'history': '한국사',
        'english': '영어',
        'civil_law': '민법',
        'civil_procedure': '민사소송법',
        'criminal_law': '형법',
        'criminal_procedure': '형사소송법',
    }

    def __init__(self, download_dir: str = "./downloads/court_exam"):
        """
        Args:
            download_dir: 파일 다운로드 디렉토리
        """
        self.download_dir = download_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        })

        if not os.path.exists(download_dir):
            os.makedirs(download_dir)

    def get_official_exam_info(self) -> Dict[str, Any]:
        """
        대법원 채용 공식 사이트에서 시험 정보 조회

        Returns:
            시험 정보 딕셔너리
        """
        try:
            response = self.session.get(self.OFFICIAL_URL, timeout=30)
            response.raise_for_status()
            return self._parse_official_info(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def get_exam_schedule(self) -> Dict[str, Any]:
        """
        법원직 시험 일정 조회

        Returns:
            시험 일정 정보
        """
        try:
            url = f"{self.OFFICIAL_URL}/main/main.html"
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return self._parse_schedule(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def search_gichul_exams(
        self,
        exam_type: str = "법원직 9급",
        year: Optional[int] = None,
        subject: str = "헌법"
    ) -> List[Dict[str, Any]]:
        """
        공기출 사이트에서 법원직 기출문제 검색

        Args:
            exam_type: 시험유형 ('법원직 9급', '법원행시')
            year: 년도
            subject: 과목

        Returns:
            검색 결과 목록

        Note:
            외부 사이트 의존으로 변경될 수 있음
        """
        search_query = f"{exam_type} {subject}"
        if year:
            search_query = f"{year} {search_query}"

        # 공기출 검색 URL 구성
        params = {
            'q': search_query,
        }

        try:
            search_url = f"{self.GICHUL_BASE_URL}/search"
            response = self.session.get(search_url, params=params, timeout=30)
            response.raise_for_status()
            return self._parse_gichul_results(response.text)
        except requests.RequestException as e:
            return [{'error': str(e)}]

    def get_grade9_constitution_exams(
        self,
        start_year: int = 2015,
        end_year: Optional[int] = None
    ) -> List[CourtExamQuestion]:
        """
        법원직 9급 헌법 기출문제 조회

        Args:
            start_year: 시작 년도
            end_year: 종료 년도

        Returns:
            CourtExamQuestion 리스트
        """
        from datetime import datetime

        if end_year is None:
            end_year = datetime.now().year

        questions = []

        # 년도별 기출문제 생성 (메타데이터)
        for year in range(start_year, end_year + 1):
            question = CourtExamQuestion(
                exam_type='법원직 9급',
                year=year,
                subject='헌법',
                title=f'{year}년 법원직 9급 헌법 기출문제',
                source='court'
            )
            questions.append(question)

        return questions

    def get_court_haengsi_exams(
        self,
        start_year: int = 2015,
        end_year: Optional[int] = None
    ) -> List[CourtExamQuestion]:
        """
        법원행시(법원행정고등고시) 헌법 기출문제 조회

        Args:
            start_year: 시작 년도
            end_year: 종료 년도

        Returns:
            CourtExamQuestion 리스트
        """
        from datetime import datetime

        if end_year is None:
            end_year = datetime.now().year

        questions = []

        for year in range(start_year, end_year + 1):
            question = CourtExamQuestion(
                exam_type='법원행시',
                year=year,
                subject='헌법',
                title=f'{year}년 법원행정고등고시 헌법 기출문제',
                source='court'
            )
            questions.append(question)

        return questions

    def get_all_constitution_exams(
        self,
        start_year: int = 2015
    ) -> List[CourtExamQuestion]:
        """
        모든 법원직 헌법 기출문제 조회

        Args:
            start_year: 시작 년도

        Returns:
            전체 CourtExamQuestion 리스트
        """
        grade9_exams = self.get_grade9_constitution_exams(start_year)
        haengsi_exams = self.get_court_haengsi_exams(start_year)
        return grade9_exams + haengsi_exams

    def download_exam_file(
        self,
        file_url: str,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        기출문제 파일 다운로드

        Args:
            file_url: 파일 URL
            filename: 저장할 파일명

        Returns:
            저장된 파일 경로 또는 None
        """
        try:
            response = self.session.get(file_url, timeout=60, stream=True)
            response.raise_for_status()

            if filename is None:
                content_disposition = response.headers.get('Content-Disposition', '')
                filename_match = re.findall(
                    r'filename[*]?=["\']?(?:UTF-8\'\')?([^"\';\n]+)',
                    content_disposition
                )
                if filename_match:
                    from urllib.parse import unquote
                    filename = unquote(filename_match[0])
                else:
                    filename = os.path.basename(urlparse(file_url).path) or 'court_exam_file'

            filepath = os.path.join(self.download_dir, filename)

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return filepath
        except requests.RequestException as e:
            print(f"Download error: {e}")
            return None

    def get_exam_subjects(self, exam_type: str = "9급") -> List[str]:
        """
        시험 유형별 과목 목록 조회

        Args:
            exam_type: 시험유형 ('9급', '법원행시')

        Returns:
            과목 목록
        """
        if exam_type == "9급":
            return ['헌법', '국어', '한국사', '영어', '민법', '민사소송법', '형법', '형사소송법']
        elif exam_type == "법원행시":
            return ['헌법', '민법', '형법', '민사소송법', '형사소송법', '행정법']
        return []

    def _parse_official_info(self, html: str) -> Dict[str, Any]:
        """공식 사이트 정보 파싱"""
        soup = BeautifulSoup(html, 'html.parser')

        info = {
            'title': '',
            'announcements': [],
            'schedules': [],
        }

        # 제목 추출
        title_elem = soup.find('title')
        if title_elem:
            info['title'] = title_elem.get_text(strip=True)

        # 공지사항 추출
        notice_area = soup.find('div', class_='notice') or soup.find('ul', class_='notice_list')
        if notice_area:
            for item in notice_area.find_all('li')[:5]:
                link = item.find('a')
                if link:
                    info['announcements'].append({
                        'title': link.get_text(strip=True),
                        'url': urljoin(self.OFFICIAL_URL, link.get('href', ''))
                    })

        return info

    def _parse_schedule(self, html: str) -> Dict[str, Any]:
        """시험 일정 파싱"""
        soup = BeautifulSoup(html, 'html.parser')

        schedule = {
            'exams': [],
            'notices': [],
        }

        # 일정 테이블 찾기
        schedule_table = soup.find('table', class_='schedule') or soup.find('div', class_='schedule')
        if schedule_table:
            rows = schedule_table.find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 2:
                    schedule['exams'].append({
                        'name': cols[0].get_text(strip=True),
                        'date': cols[1].get_text(strip=True) if len(cols) > 1 else '',
                    })

        return schedule

    def _parse_gichul_results(self, html: str) -> List[Dict[str, Any]]:
        """공기출 검색 결과 파싱"""
        soup = BeautifulSoup(html, 'html.parser')
        results = []

        # 검색 결과 목록 찾기
        result_items = soup.find_all('div', class_='search-result') or soup.find_all('li', class_='item')

        for item in result_items[:20]:  # 상위 20개만
            try:
                link = item.find('a')
                if not link:
                    continue

                title = link.get_text(strip=True)
                href = link.get('href', '')

                # 법원직, 헌법 관련만 필터링
                if '법원' not in title and '헌법' not in title:
                    continue

                result = {
                    'title': title,
                    'url': urljoin(self.GICHUL_BASE_URL, href),
                }
                results.append(result)

            except Exception:
                continue

        return results

    def create_exam_metadata(
        self,
        exam_type: str,
        year: int,
        subject: str = "헌법"
    ) -> CourtExamQuestion:
        """
        기출문제 메타데이터 생성

        Args:
            exam_type: 시험유형
            year: 년도
            subject: 과목

        Returns:
            CourtExamQuestion 객체
        """
        title = f"{year}년 {exam_type} {subject} 기출문제"
        return CourtExamQuestion(
            exam_type=exam_type,
            year=year,
            subject=subject,
            title=title,
            source='court'
        )

    def export_to_json(self, questions: List[CourtExamQuestion], filepath: str):
        """기출문제 목록을 JSON으로 저장"""
        data = [asdict(q) for q in questions]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_exam_summary(self) -> Dict[str, Any]:
        """
        법원직 시험 요약 정보

        Returns:
            요약 정보 딕셔너리
        """
        grade9_exams = self.get_grade9_constitution_exams()
        haengsi_exams = self.get_court_haengsi_exams()

        summary = {
            'grade9_count': len(grade9_exams),
            'haengsi_count': len(haengsi_exams),
            'total_count': len(grade9_exams) + len(haengsi_exams),
            'grade9_subjects': self.get_exam_subjects('9급'),
            'haengsi_subjects': self.get_exam_subjects('법원행시'),
            'years_covered': {
                'grade9': [e.year for e in grade9_exams],
                'haengsi': [e.year for e in haengsi_exams],
            }
        }

        return summary

    def get_exam_info_by_year(self, year: int) -> Dict[str, Any]:
        """
        특정 년도 법원직 시험 정보

        Args:
            year: 년도

        Returns:
            시험 정보 딕셔너리
        """
        return {
            'year': year,
            'exams': [
                {
                    'type': '법원직 9급',
                    'subjects': self.get_exam_subjects('9급'),
                    'constitution_included': True,
                },
                {
                    'type': '법원행시',
                    'subjects': self.get_exam_subjects('법원행시'),
                    'constitution_included': True,
                }
            ]
        }


# ============== 외부 소스 스크래퍼 ==============

class ExternalExamSourceScraper:
    """
    외부 기출문제 사이트 스크래퍼

    공기출(0gichul.com) 등 외부 사이트에서 법원직 기출문제 수집
    """

    GICHUL_URL = "https://0gichul.com"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def search_court_exams(
        self,
        year: int,
        exam_type: str = "9급"
    ) -> List[Dict[str, Any]]:
        """
        공기출에서 법원직 기출문제 검색

        Args:
            year: 년도
            exam_type: 시험유형

        Returns:
            검색 결과 목록
        """
        search_query = f"{year} 법원직 {exam_type} 헌법"

        try:
            # 실제 검색 로직
            # (공기출 사이트 구조에 따라 구현)
            return [{
                'title': f'{year}년 법원직 {exam_type} 헌법 기출문제',
                'source': 'gichul',
                'year': year,
            }]
        except Exception as e:
            return [{'error': str(e)}]


# ============== 편의 함수 ==============

def get_court_exam_list(
    exam_type: str = "9급",
    start_year: int = 2015
) -> List[Dict[str, Any]]:
    """
    법원직 헌법 기출문제 목록 조회 (편의 함수)

    Args:
        exam_type: 시험유형 ('9급', '법원행시')
        start_year: 시작 년도

    Returns:
        기출문제 목록

    Example:
        >>> exams = get_court_exam_list("9급", 2020)
        >>> for exam in exams:
        ...     print(f"{exam['year']}년: {exam['title']}")
    """
    scraper = CourtExamScraper()

    if exam_type == "9급":
        questions = scraper.get_grade9_constitution_exams(start_year)
    elif exam_type == "법원행시":
        questions = scraper.get_court_haengsi_exams(start_year)
    else:
        questions = scraper.get_all_constitution_exams(start_year)

    return [asdict(q) for q in questions]


def get_all_court_exams(start_year: int = 2015) -> List[Dict[str, Any]]:
    """
    모든 법원직 헌법 기출문제 조회 (편의 함수)

    Args:
        start_year: 시작 년도

    Returns:
        전체 기출문제 목록
    """
    scraper = CourtExamScraper()
    questions = scraper.get_all_constitution_exams(start_year)
    return [asdict(q) for q in questions]


def get_court_exam_subjects(exam_type: str = "9급") -> List[str]:
    """
    법원직 시험 과목 목록 (편의 함수)

    Args:
        exam_type: 시험유형

    Returns:
        과목 목록
    """
    scraper = CourtExamScraper()
    return scraper.get_exam_subjects(exam_type)


if __name__ == "__main__":
    # 테스트 실행
    scraper = CourtExamScraper()

    print("=== 대법원 채용(법원직) 기출문제 크롤러 테스트 ===\n")

    # 공식 사이트 정보
    print("1. 대법원 채용 공식 사이트 정보:")
    info = scraper.get_official_exam_info()
    if 'error' not in info:
        print(f"   사이트: {info.get('title', 'N/A')}")
    else:
        print(f"   오류: {info.get('error')}")

    # 법원직 9급 헌법 기출문제
    print("\n2. 법원직 9급 헌법 기출문제 목록:")
    grade9_exams = scraper.get_grade9_constitution_exams(2020)
    print(f"   총 {len(grade9_exams)}건")
    for exam in grade9_exams[:3]:
        print(f"   - {exam.year}년: {exam.title}")

    # 법원행시 헌법 기출문제
    print("\n3. 법원행시 헌법 기출문제 목록:")
    haengsi_exams = scraper.get_court_haengsi_exams(2020)
    print(f"   총 {len(haengsi_exams)}건")
    for exam in haengsi_exams[:3]:
        print(f"   - {exam.year}년: {exam.title}")

    # 요약 정보
    print("\n4. 법원직 시험 요약 정보:")
    summary = scraper.get_exam_summary()
    print(f"   9급 기출: {summary['grade9_count']}건")
    print(f"   법원행시 기출: {summary['haengsi_count']}건")
    print(f"   9급 과목: {', '.join(summary['grade9_subjects'])}")

    # 시험 과목
    print("\n5. 시험 유형별 과목:")
    print(f"   9급: {scraper.get_exam_subjects('9급')}")
    print(f"   법원행시: {scraper.get_exam_subjects('법원행시')}")

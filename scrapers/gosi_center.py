"""
사이버국가고시센터 크롤러
Cyber Government Exam Center Scraper

공식 사이트: https://www.gosi.kr/
기출문제 페이지: https://www.gosi.kr/cop/bbs/gosiQnaChoice.do

대상: 5급, 7급, 9급 공무원 시험 헌법 기출문제
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
import json
import re
import os
from urllib.parse import urljoin, urlparse, parse_qs
import time


@dataclass
class ExamQuestion:
    """시험 문제 데이터 클래스"""
    exam_type: str  # 시험유형 (5급, 7급, 9급)
    exam_name: str  # 시험명
    year: int  # 시험년도
    subject: str  # 과목 (헌법)
    question_file_url: Optional[str] = None  # 문제파일 URL
    answer_file_url: Optional[str] = None  # 정답파일 URL
    exam_date: Optional[str] = None  # 시험일자


@dataclass
class ExamListItem:
    """시험 목록 항목"""
    title: str  # 제목
    exam_type: str  # 시험유형
    year: int  # 년도
    detail_url: str  # 상세 페이지 URL
    files: List[Dict[str, str]]  # 첨부파일 목록


class GosiCenterScraper:
    """
    사이버국가고시센터 스크래퍼

    기능:
    - 5급 공채 헌법 기출문제 크롤링
    - 7급 공채 헌법 기출문제 크롤링
    - 9급 공채 헌법 기출문제 크롤링
    - PSAT, 헌법 문제/정답 다운로드
    """

    BASE_URL = "https://www.gosi.kr"

    # 선택형 문제/정답 페이지
    CHOICE_EXAM_URL = "https://www.gosi.kr/cop/bbs/gosiQnaChoice.do"

    # 서술형 문제 페이지
    ESSAY_EXAM_URL = "https://www.gosi.kr/cop/bbs/selectBoardList.do"

    # 시험 유형 코드
    EXAM_TYPES = {
        '5급공채': 'grade5',
        '5급공개경쟁': 'grade5',
        '7급공채': 'grade7',
        '7급공개경쟁': 'grade7',
        '9급공채': 'grade9',
        '9급공개경쟁': 'grade9',
        '외교관후보자': 'diplomat',
        '지역인재': 'local',
        '민간경력자': 'private',
    }

    def __init__(self, download_dir: str = "./downloads"):
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
            'Referer': 'https://www.gosi.kr/',
        })

        # 다운로드 디렉토리 생성
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)

    def get_exam_list(
        self,
        exam_type: Optional[str] = None,
        year: Optional[int] = None,
        subject: str = "헌법",
        page: int = 1
    ) -> Dict[str, Any]:
        """
        기출문제 목록 조회

        Args:
            exam_type: 시험유형 ('5급', '7급', '9급' 등)
            year: 시험년도
            subject: 과목명 (기본값: 헌법)
            page: 페이지 번호

        Returns:
            기출문제 목록 딕셔너리
        """
        params = {
            'pageIndex': page,
        }

        if exam_type:
            params['searchCnd'] = 'examNm'
            params['searchWrd'] = exam_type

        try:
            response = self.session.get(
                self.CHOICE_EXAM_URL,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_exam_list(response.text, subject, year)
        except requests.RequestException as e:
            return {'error': str(e), 'exams': []}

    def get_constitution_exams(
        self,
        exam_type: str = "5급",
        start_year: int = 2015,
        end_year: Optional[int] = None
    ) -> List[ExamQuestion]:
        """
        헌법 기출문제 조회

        Args:
            exam_type: 시험유형 ('5급', '7급', '9급')
            start_year: 시작 년도
            end_year: 종료 년도 (기본값: 현재 년도)

        Returns:
            ExamQuestion 객체 리스트
        """
        from datetime import datetime

        if end_year is None:
            end_year = datetime.now().year

        questions = []
        page = 1
        max_pages = 20  # 최대 페이지 수 제한

        while page <= max_pages:
            result = self.get_exam_list(
                exam_type=exam_type,
                subject="헌법",
                page=page
            )

            if 'error' in result or not result.get('exams'):
                break

            for exam in result['exams']:
                if start_year <= exam['year'] <= end_year:
                    question = ExamQuestion(
                        exam_type=exam_type,
                        exam_name=exam['title'],
                        year=exam['year'],
                        subject="헌법",
                        question_file_url=exam.get('question_url'),
                        answer_file_url=exam.get('answer_url'),
                        exam_date=exam.get('exam_date')
                    )
                    questions.append(question)

            # 더 이상 데이터가 없거나 범위를 벗어나면 종료
            if result.get('has_next', False) is False:
                break

            page += 1
            time.sleep(0.5)  # Rate limiting

        return questions

    def get_grade5_constitution_exams(
        self,
        start_year: int = 2015
    ) -> List[ExamQuestion]:
        """5급 공채 헌법 기출문제 조회"""
        return self.get_constitution_exams("5급", start_year)

    def get_grade7_constitution_exams(
        self,
        start_year: int = 2015
    ) -> List[ExamQuestion]:
        """7급 공채 헌법 기출문제 조회"""
        return self.get_constitution_exams("7급", start_year)

    def get_grade9_constitution_exams(
        self,
        start_year: int = 2015
    ) -> List[ExamQuestion]:
        """9급 공채 헌법 기출문제 조회"""
        return self.get_constitution_exams("9급", start_year)

    def download_exam_file(
        self,
        file_url: str,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        시험 파일 다운로드

        Args:
            file_url: 파일 URL
            filename: 저장할 파일명 (기본값: URL에서 추출)

        Returns:
            저장된 파일 경로 또는 None
        """
        try:
            response = self.session.get(file_url, timeout=60, stream=True)
            response.raise_for_status()

            # 파일명 추출
            if filename is None:
                content_disposition = response.headers.get('Content-Disposition', '')
                if 'filename=' in content_disposition:
                    filename = re.findall(r'filename[*]?=["\']?([^"\';\n]+)', content_disposition)
                    filename = filename[0] if filename else 'exam_file'
                else:
                    filename = os.path.basename(urlparse(file_url).path)

            filepath = os.path.join(self.download_dir, filename)

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return filepath
        except requests.RequestException as e:
            print(f"Download error: {e}")
            return None

    def get_exam_detail(self, detail_url: str) -> Dict[str, Any]:
        """
        기출문제 상세 정보 조회

        Args:
            detail_url: 상세 페이지 URL

        Returns:
            상세 정보 딕셔너리
        """
        try:
            full_url = urljoin(self.BASE_URL, detail_url)
            response = self.session.get(full_url, timeout=30)
            response.raise_for_status()
            return self._parse_exam_detail(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def _parse_exam_list(
        self,
        html: str,
        subject_filter: str = "헌법",
        year_filter: Optional[int] = None
    ) -> Dict[str, Any]:
        """기출문제 목록 HTML 파싱"""
        soup = BeautifulSoup(html, 'html.parser')
        exams = []

        # 테이블 행 찾기
        table = soup.find('table', class_='board_list') or soup.find('table')
        if not table:
            return {'exams': [], 'has_next': False}

        rows = table.find_all('tr')[1:]  # 헤더 제외

        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 3:
                continue

            try:
                # 시험 정보 파싱
                title_col = cols[1] if len(cols) > 1 else cols[0]
                title_link = title_col.find('a')

                if not title_link:
                    continue

                title = title_link.get_text(strip=True)
                detail_url = title_link.get('href', '')

                # 년도 추출
                year_match = re.search(r'(\d{4})년', title)
                year = int(year_match.group(1)) if year_match else 0

                # 헌법 과목 필터링
                if subject_filter and subject_filter not in title:
                    continue

                # 년도 필터링
                if year_filter and year != year_filter:
                    continue

                # 시험 유형 판별
                exam_type = "기타"
                for key in self.EXAM_TYPES.keys():
                    if key in title:
                        exam_type = key
                        break

                # 첨부파일 URL 추출
                file_links = row.find_all('a', href=re.compile(r'download|file|attach'))
                question_url = None
                answer_url = None

                for link in file_links:
                    link_text = link.get_text(strip=True).lower()
                    href = link.get('href', '')
                    if '문제' in link_text or 'question' in link_text:
                        question_url = urljoin(self.BASE_URL, href)
                    elif '정답' in link_text or 'answer' in link_text:
                        answer_url = urljoin(self.BASE_URL, href)

                exam_info = {
                    'title': title,
                    'exam_type': exam_type,
                    'year': year,
                    'detail_url': detail_url,
                    'question_url': question_url,
                    'answer_url': answer_url,
                }
                exams.append(exam_info)

            except Exception as e:
                continue

        # 다음 페이지 존재 여부
        pagination = soup.find('div', class_='pagination') or soup.find('ul', class_='pagination')
        has_next = bool(pagination and pagination.find('a', text=re.compile(r'다음|>')))

        return {
            'exams': exams,
            'has_next': has_next,
            'total': len(exams)
        }

    def _parse_exam_detail(self, html: str) -> Dict[str, Any]:
        """기출문제 상세 페이지 HTML 파싱"""
        soup = BeautifulSoup(html, 'html.parser')

        detail = {
            'title': '',
            'content': '',
            'files': [],
            'exam_date': '',
        }

        # 제목 추출
        title_elem = soup.find('h3', class_='title') or soup.find('div', class_='view_title')
        if title_elem:
            detail['title'] = title_elem.get_text(strip=True)

        # 내용 추출
        content_elem = soup.find('div', class_='view_content') or soup.find('div', class_='content')
        if content_elem:
            detail['content'] = content_elem.get_text(strip=True)

        # 첨부파일 추출
        file_area = soup.find('div', class_='file_area') or soup.find('ul', class_='file_list')
        if file_area:
            file_links = file_area.find_all('a')
            for link in file_links:
                file_info = {
                    'name': link.get_text(strip=True),
                    'url': urljoin(self.BASE_URL, link.get('href', ''))
                }
                detail['files'].append(file_info)

        return detail

    def search_exams(
        self,
        keyword: str,
        page: int = 1
    ) -> Dict[str, Any]:
        """
        키워드로 기출문제 검색

        Args:
            keyword: 검색 키워드
            page: 페이지 번호

        Returns:
            검색 결과 딕셔너리
        """
        params = {
            'pageIndex': page,
            'searchCnd': 'all',
            'searchWrd': keyword,
        }

        try:
            response = self.session.get(
                self.CHOICE_EXAM_URL,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_exam_list(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'exams': []}

    def export_to_json(self, questions: List[ExamQuestion], filepath: str):
        """기출문제 목록을 JSON으로 저장"""
        data = [asdict(q) for q in questions]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def export_to_csv(self, questions: List[ExamQuestion], filepath: str):
        """기출문제 목록을 CSV로 저장"""
        import csv

        if not questions:
            return

        fieldnames = ['exam_type', 'exam_name', 'year', 'subject',
                      'question_file_url', 'answer_file_url', 'exam_date']

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for q in questions:
                writer.writerow(asdict(q))


# ============== 편의 함수 ==============

def get_constitution_exam_list(
    exam_type: str = "5급",
    start_year: int = 2015
) -> List[Dict[str, Any]]:
    """
    헌법 기출문제 목록 조회 (편의 함수)

    Args:
        exam_type: 시험유형 ('5급', '7급', '9급')
        start_year: 시작 년도

    Returns:
        기출문제 목록

    Example:
        >>> exams = get_constitution_exam_list("5급", 2020)
        >>> for exam in exams:
        ...     print(f"{exam.year}년: {exam.exam_name}")
    """
    scraper = GosiCenterScraper()
    questions = scraper.get_constitution_exams(exam_type, start_year)
    return [asdict(q) for q in questions]


def download_constitution_exams(
    exam_type: str = "5급",
    year: int = 2023,
    download_dir: str = "./downloads"
) -> List[str]:
    """
    특정 년도 헌법 기출문제 다운로드 (편의 함수)

    Args:
        exam_type: 시험유형
        year: 년도
        download_dir: 다운로드 디렉토리

    Returns:
        다운로드된 파일 경로 리스트
    """
    scraper = GosiCenterScraper(download_dir)
    questions = scraper.get_constitution_exams(exam_type, year, year)

    downloaded = []
    for q in questions:
        if q.question_file_url:
            path = scraper.download_exam_file(
                q.question_file_url,
                f"{exam_type}_{year}_헌법_문제.pdf"
            )
            if path:
                downloaded.append(path)

        if q.answer_file_url:
            path = scraper.download_exam_file(
                q.answer_file_url,
                f"{exam_type}_{year}_헌법_정답.pdf"
            )
            if path:
                downloaded.append(path)

    return downloaded


if __name__ == "__main__":
    # 테스트 실행
    scraper = GosiCenterScraper()

    print("=== 사이버국가고시센터 크롤러 테스트 ===\n")

    # 기출문제 목록 조회
    print("1. 5급 공채 헌법 기출문제 목록:")
    result = scraper.get_exam_list(exam_type="5급", subject="헌법", page=1)
    if 'error' not in result:
        print(f"   총 {result.get('total', 0)}건 조회됨")
        for exam in result.get('exams', [])[:3]:
            print(f"   - {exam['year']}년: {exam['title'][:40]}...")
    else:
        print(f"   오류: {result['error']}")

    print("\n2. 헌법 키워드 검색:")
    result = scraper.search_exams("헌법", page=1)
    if 'error' not in result:
        print(f"   총 {result.get('total', 0)}건 검색됨")
    else:
        print(f"   오류: {result['error']}")

    print("\n3. 9급 공채 헌법 기출문제 목록:")
    result = scraper.get_exam_list(exam_type="9급", subject="헌법", page=1)
    if 'error' not in result:
        print(f"   총 {result.get('total', 0)}건 조회됨")
        for exam in result.get('exams', [])[:3]:
            print(f"   - {exam['year']}년: {exam['title'][:40]}...")
    else:
        print(f"   오류: {result['error']}")

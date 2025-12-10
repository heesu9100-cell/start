"""
법무부 변호사시험 기출문제 크롤러
Ministry of Justice Bar Exam Scraper

공식 사이트: https://www.moj.go.kr/moj/405/subview.do
기출문제 다운로드 페이지

대상: 변호사시험 공법(헌법) 기출문제
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
class BarExamQuestion:
    """변호사시험 기출문제 데이터 클래스"""
    exam_no: int  # 회차 (제1회, 제2회, ...)
    year: int  # 시험년도
    exam_type: str  # 문제유형 (선택형, 사례형, 기록형)
    subject: str  # 과목 (공법-헌법, 민사법, 형사법, 선택과목)
    title: str  # 제목
    file_url: str  # 파일 URL
    file_name: str  # 파일명
    answer_url: Optional[str] = None  # 정답 URL (선택형의 경우)


@dataclass
class BarExamInfo:
    """변호사시험 정보"""
    exam_no: int  # 회차
    year: int  # 년도
    exam_date: str  # 시험일
    questions: List[BarExamQuestion]  # 문제 목록


class BarExamScraper:
    """
    법무부 변호사시험 기출문제 스크래퍼

    기능:
    - 변호사시험 선택형/사례형/기록형 기출문제 크롤링
    - 공법(헌법) 관련 문제 필터링
    - 문제 및 정답 파일 다운로드
    """

    BASE_URL = "https://www.moj.go.kr"

    # 기출문제 게시판 URL
    EXAM_LIST_URL = "https://www.moj.go.kr/moj/405/subview.do"

    # 게시판 상세 URL 패턴
    ARTICLE_URL = "https://www.moj.go.kr/bbs/moj/150/{article_id}/artclView.do"

    # 파일 다운로드 URL 패턴
    FILE_DOWNLOAD_URL = "https://www.moj.go.kr/cmm/fms/FileDown.do"

    # 과목 분류
    SUBJECTS = {
        '공법': ['헌법', '행정법'],
        '민사법': ['민법', '민사소송법'],
        '형사법': ['형법', '형사소송법'],
    }

    def __init__(self, download_dir: str = "./downloads/bar_exam"):
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
            'Referer': 'https://www.moj.go.kr/',
        })

        if not os.path.exists(download_dir):
            os.makedirs(download_dir)

    def get_exam_list(self, page: int = 1) -> Dict[str, Any]:
        """
        변호사시험 기출문제 목록 조회

        Args:
            page: 페이지 번호

        Returns:
            기출문제 목록 딕셔너리
        """
        params = {
            'pageIndex': page,
        }

        try:
            response = self.session.get(
                self.EXAM_LIST_URL,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_exam_list(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'exams': []}

    def get_all_exams(self, max_pages: int = 10) -> List[Dict[str, Any]]:
        """
        모든 변호사시험 기출문제 목록 조회

        Args:
            max_pages: 최대 페이지 수

        Returns:
            모든 기출문제 목록
        """
        all_exams = []
        page = 1

        while page <= max_pages:
            result = self.get_exam_list(page)
            if 'error' in result or not result.get('exams'):
                break

            all_exams.extend(result['exams'])

            if not result.get('has_next', False):
                break

            page += 1
            time.sleep(0.5)

        return all_exams

    def get_exam_detail(self, article_id: str) -> Dict[str, Any]:
        """
        기출문제 상세 페이지 조회

        Args:
            article_id: 게시글 ID

        Returns:
            상세 정보 딕셔너리
        """
        url = self.ARTICLE_URL.format(article_id=article_id)

        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return self._parse_exam_detail(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def get_constitution_exams(
        self,
        exam_type: Optional[str] = None,
        start_exam_no: int = 1,
        end_exam_no: Optional[int] = None
    ) -> List[BarExamQuestion]:
        """
        헌법(공법) 관련 기출문제만 조회

        Args:
            exam_type: 문제유형 ('선택형', '사례형', '기록형')
            start_exam_no: 시작 회차
            end_exam_no: 종료 회차

        Returns:
            헌법 관련 BarExamQuestion 리스트
        """
        all_exams = self.get_all_exams()
        constitution_exams = []

        for exam in all_exams:
            # 공법/헌법 관련 필터링
            title = exam.get('title', '').lower()
            if '공법' not in title and '헌법' not in title:
                continue

            # 문제유형 필터링
            if exam_type and exam_type not in title:
                continue

            # 회차 추출 및 필터링
            exam_no = self._extract_exam_no(exam.get('title', ''))
            if exam_no:
                if exam_no < start_exam_no:
                    continue
                if end_exam_no and exam_no > end_exam_no:
                    continue

            # 상세 정보 조회
            if exam.get('article_id'):
                detail = self.get_exam_detail(exam['article_id'])
                if 'error' not in detail:
                    for file_info in detail.get('files', []):
                        question = BarExamQuestion(
                            exam_no=exam_no or 0,
                            year=exam.get('year', 0),
                            exam_type=self._extract_exam_type(exam.get('title', '')),
                            subject='공법(헌법)',
                            title=exam.get('title', ''),
                            file_url=file_info.get('url', ''),
                            file_name=file_info.get('name', ''),
                            answer_url=file_info.get('answer_url')
                        )
                        constitution_exams.append(question)
                time.sleep(0.5)

        return constitution_exams

    def get_selective_exams(self) -> List[BarExamQuestion]:
        """선택형 공법(헌법) 기출문제 조회"""
        return self.get_constitution_exams(exam_type='선택형')

    def get_case_exams(self) -> List[BarExamQuestion]:
        """사례형 공법(헌법) 기출문제 조회"""
        return self.get_constitution_exams(exam_type='사례형')

    def get_record_exams(self) -> List[BarExamQuestion]:
        """기록형 공법(헌법) 기출문제 조회"""
        return self.get_constitution_exams(exam_type='기록형')

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
                    filename = filename_match[0]
                else:
                    filename = os.path.basename(urlparse(file_url).path) or 'bar_exam_file'

            # URL 디코딩
            from urllib.parse import unquote
            filename = unquote(filename)

            filepath = os.path.join(self.download_dir, filename)

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return filepath
        except requests.RequestException as e:
            print(f"Download error: {e}")
            return None

    def download_constitution_exams(
        self,
        exam_no: Optional[int] = None
    ) -> List[str]:
        """
        헌법 기출문제 일괄 다운로드

        Args:
            exam_no: 특정 회차만 다운로드 (None이면 전체)

        Returns:
            다운로드된 파일 경로 리스트
        """
        exams = self.get_constitution_exams()
        downloaded = []

        for exam in exams:
            if exam_no and exam.exam_no != exam_no:
                continue

            if exam.file_url:
                path = self.download_exam_file(
                    exam.file_url,
                    f"제{exam.exam_no}회_변호사시험_{exam.exam_type}_{exam.file_name}"
                )
                if path:
                    downloaded.append(path)
                time.sleep(1)

        return downloaded

    def _parse_exam_list(self, html: str) -> Dict[str, Any]:
        """기출문제 목록 HTML 파싱"""
        soup = BeautifulSoup(html, 'html.parser')
        exams = []

        # 게시판 테이블 찾기
        table = soup.find('table', class_='board_list') or soup.find('table')
        if not table:
            return {'exams': [], 'has_next': False}

        rows = table.find_all('tr')

        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 2:
                continue

            try:
                # 제목 및 링크 추출
                title_col = cols[1] if len(cols) > 1 else cols[0]
                title_link = title_col.find('a')

                if not title_link:
                    continue

                title = title_link.get_text(strip=True)
                href = title_link.get('href', '')

                # 게시글 ID 추출
                article_id_match = re.search(r'/(\d+)/artclView', href)
                article_id = article_id_match.group(1) if article_id_match else None

                # 년도 추출
                year_match = re.search(r'(\d{4})년도?', title)
                year = int(year_match.group(1)) if year_match else 0

                # 회차 추출
                exam_no = self._extract_exam_no(title)

                # 작성일 추출
                date_col = cols[-1] if cols else None
                date_text = date_col.get_text(strip=True) if date_col else ''

                exam_info = {
                    'title': title,
                    'article_id': article_id,
                    'year': year,
                    'exam_no': exam_no,
                    'date': date_text,
                    'url': urljoin(self.BASE_URL, href),
                }
                exams.append(exam_info)

            except Exception:
                continue

        # 페이지네이션 확인
        pagination = soup.find('div', class_='pagination')
        has_next = bool(pagination and pagination.find('a', class_='next'))

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
            'date': '',
        }

        # 제목 추출
        title_elem = soup.find('div', class_='view_title') or soup.find('h4', class_='tit')
        if title_elem:
            detail['title'] = title_elem.get_text(strip=True)

        # 내용 추출
        content_elem = soup.find('div', class_='view_con') or soup.find('div', class_='board_view')
        if content_elem:
            detail['content'] = content_elem.get_text(strip=True)

        # 첨부파일 추출
        file_area = soup.find('dl', class_='file') or soup.find('div', class_='file_list')
        if file_area:
            file_links = file_area.find_all('a')
            for link in file_links:
                href = link.get('href', '')
                if 'FileDown' in href or 'download' in href.lower():
                    file_info = {
                        'name': link.get_text(strip=True),
                        'url': urljoin(self.BASE_URL, href)
                    }
                    detail['files'].append(file_info)

        return detail

    def _extract_exam_no(self, title: str) -> Optional[int]:
        """제목에서 회차 추출"""
        match = re.search(r'제\s*(\d+)\s*회', title)
        if match:
            return int(match.group(1))
        return None

    def _extract_exam_type(self, title: str) -> str:
        """제목에서 문제유형 추출"""
        if '선택형' in title:
            return '선택형'
        elif '사례형' in title:
            return '사례형'
        elif '기록형' in title:
            return '기록형'
        return '기타'

    def export_to_json(self, questions: List[BarExamQuestion], filepath: str):
        """기출문제 목록을 JSON으로 저장"""
        data = [asdict(q) for q in questions]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_exam_summary(self) -> Dict[str, Any]:
        """
        변호사시험 기출문제 요약 정보

        Returns:
            요약 정보 딕셔너리
        """
        all_exams = self.get_all_exams()

        summary = {
            'total_count': len(all_exams),
            'by_year': {},
            'by_type': {
                '선택형': 0,
                '사례형': 0,
                '기록형': 0,
                '기타': 0
            },
            'constitution_related': 0
        }

        for exam in all_exams:
            year = exam.get('year', 0)
            title = exam.get('title', '')

            # 년도별 집계
            if year:
                summary['by_year'][year] = summary['by_year'].get(year, 0) + 1

            # 유형별 집계
            exam_type = self._extract_exam_type(title)
            summary['by_type'][exam_type] += 1

            # 헌법 관련 집계
            if '공법' in title or '헌법' in title:
                summary['constitution_related'] += 1

        return summary


# ============== 편의 함수 ==============

def get_bar_exam_list() -> List[Dict[str, Any]]:
    """
    변호사시험 기출문제 목록 조회 (편의 함수)

    Returns:
        기출문제 목록

    Example:
        >>> exams = get_bar_exam_list()
        >>> for exam in exams:
        ...     print(f"제{exam['exam_no']}회: {exam['title']}")
    """
    scraper = BarExamScraper()
    return scraper.get_all_exams()


def get_constitution_bar_exams(
    exam_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    변호사시험 헌법(공법) 기출문제 조회 (편의 함수)

    Args:
        exam_type: 문제유형 ('선택형', '사례형', '기록형')

    Returns:
        헌법 관련 기출문제 목록
    """
    scraper = BarExamScraper()
    questions = scraper.get_constitution_exams(exam_type=exam_type)
    return [asdict(q) for q in questions]


def download_bar_exam(
    exam_no: int,
    download_dir: str = "./downloads/bar_exam"
) -> List[str]:
    """
    특정 회차 변호사시험 기출문제 다운로드 (편의 함수)

    Args:
        exam_no: 회차
        download_dir: 다운로드 디렉토리

    Returns:
        다운로드된 파일 경로 리스트
    """
    scraper = BarExamScraper(download_dir)
    return scraper.download_constitution_exams(exam_no)


if __name__ == "__main__":
    # 테스트 실행
    scraper = BarExamScraper()

    print("=== 법무부 변호사시험 기출문제 크롤러 테스트 ===\n")

    # 기출문제 목록 조회
    print("1. 변호사시험 기출문제 목록 조회:")
    result = scraper.get_exam_list(page=1)
    if 'error' not in result:
        print(f"   총 {result.get('total', 0)}건 조회됨")
        for exam in result.get('exams', [])[:5]:
            print(f"   - 제{exam.get('exam_no', '?')}회: {exam['title'][:40]}...")
    else:
        print(f"   오류: {result['error']}")

    # 요약 정보
    print("\n2. 기출문제 요약 정보:")
    summary = scraper.get_exam_summary()
    print(f"   총 {summary['total_count']}건")
    print(f"   공법(헌법) 관련: {summary['constitution_related']}건")
    print(f"   유형별: {summary['by_type']}")

"""
국회채용시스템 크롤러
National Assembly Recruitment System Scraper

공식 사이트: https://gosi.assembly.go.kr/
기출문제 자료실: https://gosi.assembly.go.kr/board/pdsList.do

대상: 입법고시(5급), 8급 국회직 헌법 기출문제
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
class LegislativeExamQuestion:
    """입법고시/국회직 기출문제 데이터 클래스"""
    exam_type: str  # 시험유형 (입법고시, 8급)
    exam_round: int  # 회차
    year: int  # 시험년도
    subject: str  # 과목
    exam_stage: str  # 시험단계 (1차, 2차)
    title: str  # 제목
    file_url: Optional[str] = None  # 파일 URL
    file_name: Optional[str] = None  # 파일명
    answer_url: Optional[str] = None  # 정답 URL


class AssemblyExamScraper:
    """
    국회채용시스템 기출문제 스크래퍼

    기능:
    - 입법고시(입법고등고시) 헌법 기출문제 크롤링
    - 8급 국회직 헌법 기출문제 크롤링
    - PSAT (언어논리, 자료해석, 상황판단) 기출문제
    - 헌법 필기시험 기출문제
    """

    BASE_URL = "https://gosi.assembly.go.kr"

    # 자료실(기출문제) 게시판 URL
    MATERIALS_URL = "https://gosi.assembly.go.kr/board/pdsList.do"

    # 공지사항 URL
    NOTICE_URL = "https://gosi.assembly.go.kr/board/noticeList.do"

    # 시험 유형
    EXAM_TYPES = {
        '입법고시': 'legislative',
        '입법고등고시': 'legislative',
        '8급': 'grade8',
        '국회직8급': 'grade8',
    }

    def __init__(self, download_dir: str = "./downloads/assembly_exam"):
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
            'Referer': 'https://gosi.assembly.go.kr/',
        })

        if not os.path.exists(download_dir):
            os.makedirs(download_dir)

    def get_materials_list(
        self,
        page: int = 1,
        search_keyword: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        자료실(기출문제) 목록 조회

        Args:
            page: 페이지 번호
            search_keyword: 검색어

        Returns:
            자료 목록 딕셔너리
        """
        params = {
            'pageIndex': page,
        }

        if search_keyword:
            params['searchCnd'] = '0'  # 전체 검색
            params['searchWrd'] = search_keyword

        try:
            response = self.session.get(
                self.MATERIALS_URL,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return self._parse_materials_list(response.text)
        except requests.RequestException as e:
            return {'error': str(e), 'materials': []}

    def get_all_materials(self, max_pages: int = 15) -> List[Dict[str, Any]]:
        """
        모든 자료 목록 조회

        Args:
            max_pages: 최대 페이지 수

        Returns:
            전체 자료 목록
        """
        all_materials = []
        page = 1

        while page <= max_pages:
            result = self.get_materials_list(page)

            if 'error' in result or not result.get('materials'):
                break

            all_materials.extend(result['materials'])

            if not result.get('has_next', False):
                break

            page += 1
            time.sleep(0.5)

        return all_materials

    def get_material_detail(self, board_seq: str) -> Dict[str, Any]:
        """
        자료 상세 정보 조회

        Args:
            board_seq: 게시글 ID

        Returns:
            상세 정보 딕셔너리
        """
        params = {
            'boardSeq': board_seq,
        }

        try:
            url = f"{self.BASE_URL}/board/pdsView.do"
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return self._parse_material_detail(response.text)
        except requests.RequestException as e:
            return {'error': str(e)}

    def get_legislative_exam_questions(
        self,
        start_year: int = 2015,
        end_year: Optional[int] = None,
        exam_stage: Optional[str] = None
    ) -> List[LegislativeExamQuestion]:
        """
        입법고시 헌법 기출문제 조회

        Args:
            start_year: 시작 년도
            end_year: 종료 년도
            exam_stage: 시험단계 ('1차', '2차')

        Returns:
            LegislativeExamQuestion 리스트
        """
        from datetime import datetime

        if end_year is None:
            end_year = datetime.now().year

        all_materials = self.get_all_materials()
        questions = []

        for material in all_materials:
            title = material.get('title', '')

            # 입법고시 관련 필터링
            if '입법고시' not in title and '입법고등고시' not in title:
                continue

            # 헌법 관련 필터링
            if '헌법' not in title and 'PSAT' not in title.upper():
                # PSAT도 포함 (1차 시험)
                if '1차' not in title:
                    continue

            # 년도 추출 및 필터링
            year = self._extract_year(title)
            if year:
                if year < start_year or year > end_year:
                    continue

            # 시험단계 필터링
            if exam_stage:
                if exam_stage not in title:
                    continue

            # 회차 추출
            exam_round = self._extract_round(title)

            # 상세 정보 조회
            if material.get('board_seq'):
                detail = self.get_material_detail(material['board_seq'])
                if 'error' not in detail:
                    for file_info in detail.get('files', []):
                        question = LegislativeExamQuestion(
                            exam_type='입법고시',
                            exam_round=exam_round or 0,
                            year=year or 0,
                            subject=self._extract_subject(title, file_info.get('name', '')),
                            exam_stage='1차' if '1차' in title or 'PSAT' in title.upper() else '2차',
                            title=title,
                            file_url=file_info.get('url'),
                            file_name=file_info.get('name'),
                            answer_url=file_info.get('answer_url')
                        )
                        questions.append(question)
                time.sleep(0.5)

        return questions

    def get_grade8_exam_questions(
        self,
        start_year: int = 2015,
        end_year: Optional[int] = None
    ) -> List[LegislativeExamQuestion]:
        """
        8급 국회직 헌법 기출문제 조회

        Args:
            start_year: 시작 년도
            end_year: 종료 년도

        Returns:
            LegislativeExamQuestion 리스트
        """
        from datetime import datetime

        if end_year is None:
            end_year = datetime.now().year

        all_materials = self.get_all_materials()
        questions = []

        for material in all_materials:
            title = material.get('title', '')

            # 8급 관련 필터링
            if '8급' not in title:
                continue

            # 헌법 관련 필터링
            if '헌법' not in title:
                continue

            # 년도 추출 및 필터링
            year = self._extract_year(title)
            if year:
                if year < start_year or year > end_year:
                    continue

            # 상세 정보 조회
            if material.get('board_seq'):
                detail = self.get_material_detail(material['board_seq'])
                if 'error' not in detail:
                    for file_info in detail.get('files', []):
                        question = LegislativeExamQuestion(
                            exam_type='8급',
                            exam_round=0,
                            year=year or 0,
                            subject='헌법',
                            exam_stage='필기',
                            title=title,
                            file_url=file_info.get('url'),
                            file_name=file_info.get('name')
                        )
                        questions.append(question)
                time.sleep(0.5)

        return questions

    def search_constitution_exams(self, keyword: str = "헌법") -> List[Dict[str, Any]]:
        """
        헌법 관련 기출문제 검색

        Args:
            keyword: 검색 키워드

        Returns:
            검색 결과 목록
        """
        result = self.get_materials_list(search_keyword=keyword)
        return result.get('materials', [])

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
            full_url = urljoin(self.BASE_URL, file_url)
            response = self.session.get(full_url, timeout=60, stream=True)
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
                    filename = os.path.basename(urlparse(file_url).path) or 'assembly_exam_file'

            filepath = os.path.join(self.download_dir, filename)

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return filepath
        except requests.RequestException as e:
            print(f"Download error: {e}")
            return None

    def download_legislative_exams(
        self,
        year: Optional[int] = None,
        exam_stage: Optional[str] = None
    ) -> List[str]:
        """
        입법고시 기출문제 일괄 다운로드

        Args:
            year: 특정 년도만 다운로드
            exam_stage: 시험단계 ('1차', '2차')

        Returns:
            다운로드된 파일 경로 리스트
        """
        questions = self.get_legislative_exam_questions(exam_stage=exam_stage)
        downloaded = []

        for q in questions:
            if year and q.year != year:
                continue

            if q.file_url:
                path = self.download_exam_file(
                    q.file_url,
                    f"제{q.exam_round}회_입법고시_{q.exam_stage}_{q.subject}_{q.file_name}"
                )
                if path:
                    downloaded.append(path)
                time.sleep(1)

        return downloaded

    def _parse_materials_list(self, html: str) -> Dict[str, Any]:
        """자료실 목록 HTML 파싱"""
        soup = BeautifulSoup(html, 'html.parser')
        materials = []

        # 테이블 또는 리스트 찾기
        table = soup.find('table', class_='board_list') or soup.find('table')
        list_area = soup.find('ul', class_='board_list') or soup.find('div', class_='list_area')

        if table:
            rows = table.find_all('tr')[1:]  # 헤더 제외

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 2:
                    continue

                try:
                    # 제목 추출
                    title_col = None
                    for col in cols:
                        link = col.find('a')
                        if link:
                            title_col = col
                            break

                    if not title_col:
                        continue

                    title_link = title_col.find('a')
                    title = title_link.get_text(strip=True)
                    href = title_link.get('href', '')

                    # board_seq 추출
                    seq_match = re.search(r'boardSeq=(\d+)', href)
                    board_seq = seq_match.group(1) if seq_match else None

                    # onclick에서 추출 시도
                    if not board_seq:
                        onclick = title_link.get('onclick', '')
                        seq_match = re.search(r"'(\d+)'", onclick)
                        board_seq = seq_match.group(1) if seq_match else None

                    # 날짜 추출
                    date_text = ''
                    if len(cols) >= 3:
                        date_text = cols[-1].get_text(strip=True)

                    material_info = {
                        'title': title,
                        'board_seq': board_seq,
                        'url': urljoin(self.BASE_URL, href) if href else '',
                        'date': date_text,
                    }
                    materials.append(material_info)

                except Exception:
                    continue

        elif list_area:
            items = list_area.find_all('li') or list_area.find_all('div', class_='item')

            for item in items:
                try:
                    link = item.find('a')
                    if not link:
                        continue

                    title = link.get_text(strip=True)
                    href = link.get('href', '')

                    seq_match = re.search(r'boardSeq=(\d+)', href)
                    board_seq = seq_match.group(1) if seq_match else None

                    material_info = {
                        'title': title,
                        'board_seq': board_seq,
                        'url': urljoin(self.BASE_URL, href),
                        'date': '',
                    }
                    materials.append(material_info)

                except Exception:
                    continue

        # 페이지네이션 확인
        pagination = soup.find('div', class_='pagination') or soup.find('ul', class_='pagination')
        has_next = bool(pagination and (
            pagination.find('a', class_='next') or
            pagination.find('a', text=re.compile(r'다음|>'))
        ))

        return {
            'materials': materials,
            'has_next': has_next,
            'total': len(materials)
        }

    def _parse_material_detail(self, html: str) -> Dict[str, Any]:
        """자료 상세 페이지 HTML 파싱"""
        soup = BeautifulSoup(html, 'html.parser')

        detail = {
            'title': '',
            'content': '',
            'files': [],
            'date': '',
        }

        # 제목 추출
        title_elem = soup.find('h4', class_='tit') or soup.find('div', class_='view_title')
        if title_elem:
            detail['title'] = title_elem.get_text(strip=True)

        # 내용 추출
        content_elem = soup.find('div', class_='view_con') or soup.find('div', class_='content')
        if content_elem:
            detail['content'] = content_elem.get_text(strip=True)

        # 첨부파일 추출
        file_areas = soup.find_all('a', href=re.compile(r'download|file|attach', re.I))

        for link in file_areas:
            href = link.get('href', '')
            if href:
                file_info = {
                    'name': link.get_text(strip=True),
                    'url': href
                }
                detail['files'].append(file_info)

        # 파일 영역에서 추가 검색
        file_list = soup.find('ul', class_='file_list') or soup.find('div', class_='file_area')
        if file_list:
            for link in file_list.find_all('a'):
                href = link.get('href', '')
                if href and href not in [f['url'] for f in detail['files']]:
                    file_info = {
                        'name': link.get_text(strip=True),
                        'url': href
                    }
                    detail['files'].append(file_info)

        return detail

    def _extract_year(self, title: str) -> Optional[int]:
        """제목에서 년도 추출"""
        match = re.search(r'(\d{4})년', title)
        if match:
            return int(match.group(1))
        return None

    def _extract_round(self, title: str) -> Optional[int]:
        """제목에서 회차 추출"""
        match = re.search(r'제\s*(\d+)\s*회', title)
        if match:
            return int(match.group(1))
        return None

    def _extract_subject(self, title: str, filename: str = '') -> str:
        """제목/파일명에서 과목 추출"""
        combined = f"{title} {filename}"

        if '헌법' in combined:
            return '헌법'
        elif 'PSAT' in combined.upper():
            if '언어' in combined:
                return 'PSAT-언어논리'
            elif '자료' in combined:
                return 'PSAT-자료해석'
            elif '상황' in combined:
                return 'PSAT-상황판단'
            return 'PSAT'
        return '기타'

    def export_to_json(self, questions: List[LegislativeExamQuestion], filepath: str):
        """기출문제 목록을 JSON으로 저장"""
        data = [asdict(q) for q in questions]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_exam_summary(self) -> Dict[str, Any]:
        """
        기출문제 요약 정보

        Returns:
            요약 정보 딕셔너리
        """
        all_materials = self.get_all_materials()

        summary = {
            'total_count': len(all_materials),
            'legislative_exam': 0,
            'grade8_exam': 0,
            'constitution_related': 0,
            'by_year': {}
        }

        for material in all_materials:
            title = material.get('title', '')

            if '입법고시' in title or '입법고등고시' in title:
                summary['legislative_exam'] += 1

            if '8급' in title:
                summary['grade8_exam'] += 1

            if '헌법' in title:
                summary['constitution_related'] += 1

            year = self._extract_year(title)
            if year:
                summary['by_year'][year] = summary['by_year'].get(year, 0) + 1

        return summary


# ============== 편의 함수 ==============

def get_legislative_exam_list(
    start_year: int = 2015
) -> List[Dict[str, Any]]:
    """
    입법고시 기출문제 목록 조회 (편의 함수)

    Args:
        start_year: 시작 년도

    Returns:
        기출문제 목록

    Example:
        >>> exams = get_legislative_exam_list(2020)
        >>> for exam in exams:
        ...     print(f"{exam['year']}년 제{exam['exam_round']}회: {exam['subject']}")
    """
    scraper = AssemblyExamScraper()
    questions = scraper.get_legislative_exam_questions(start_year=start_year)
    return [asdict(q) for q in questions]


def get_grade8_exam_list(start_year: int = 2015) -> List[Dict[str, Any]]:
    """
    8급 국회직 헌법 기출문제 목록 조회 (편의 함수)

    Args:
        start_year: 시작 년도

    Returns:
        기출문제 목록
    """
    scraper = AssemblyExamScraper()
    questions = scraper.get_grade8_exam_questions(start_year=start_year)
    return [asdict(q) for q in questions]


def search_assembly_exams(keyword: str = "헌법") -> List[Dict[str, Any]]:
    """
    국회채용시스템 기출문제 검색 (편의 함수)

    Args:
        keyword: 검색 키워드

    Returns:
        검색 결과 목록
    """
    scraper = AssemblyExamScraper()
    return scraper.search_constitution_exams(keyword)


if __name__ == "__main__":
    # 테스트 실행
    scraper = AssemblyExamScraper()

    print("=== 국회채용시스템 기출문제 크롤러 테스트 ===\n")

    # 자료실 목록 조회
    print("1. 자료실 목록 조회:")
    result = scraper.get_materials_list(page=1)
    if 'error' not in result:
        print(f"   총 {result.get('total', 0)}건 조회됨")
        for material in result.get('materials', [])[:5]:
            print(f"   - {material['title'][:50]}...")
    else:
        print(f"   오류: {result['error']}")

    # 헌법 검색
    print("\n2. '헌법' 키워드 검색:")
    results = scraper.search_constitution_exams("헌법")
    print(f"   총 {len(results)}건 검색됨")
    for r in results[:3]:
        print(f"   - {r['title'][:50]}...")

    # 요약 정보
    print("\n3. 기출문제 요약 정보:")
    summary = scraper.get_exam_summary()
    print(f"   총 자료: {summary['total_count']}건")
    print(f"   입법고시: {summary['legislative_exam']}건")
    print(f"   8급: {summary['grade8_exam']}건")
    print(f"   헌법 관련: {summary['constitution_related']}건")

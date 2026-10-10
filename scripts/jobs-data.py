#!/usr/bin/env python3
"""Build data/occupations.json, the list of real occupations the three paths are picked from.

Two public files from the U.S. Bureau of Labor Statistics (public domain) go in:

  Employment Projections, occupation.xlsx, Table 1.2: for each occupation, its median pay,
    the education, experience and training it typically takes, how much it is projected to
    grow over ten years, and its openings each year.
  Occupational Employment and Wage Statistics, national file: what the lower-paid quarter
    and the higher-paid quarter of workers earn.

BLS publishes both once a year (wages in spring, projections in late summer), so that is how
often this needs running:

  BLS_CONTACT=you@example.com python3 scripts/jobs-data.py

BLS turns away scripts that do not say who is asking, so the downloads send BLS_CONTACT as
the User-Agent. With the files already in data/bls/, nothing is downloaded and no address is
needed. Uses only the standard library.
"""

import io
import json
import os
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(ROOT, 'data', 'bls')
OUT = os.path.join(ROOT, 'data', 'occupations.json')

# The year of the wage survey. Change it when BLS publishes a new one.
WAGE_YEAR = 2025
PROJECTIONS_URL = 'https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx'
WAGES_URL = f'https://www.bls.gov/oes/special-requests/oesm{WAGE_YEAR % 100}nat.zip'
PROJECTIONS_FILE = os.path.join(RAW, 'occupation.xlsx')
WAGES_FILE = os.path.join(RAW, f'oesm{WAGE_YEAR % 100}nat.zip')

# BLS prints wages above this as "#": the survey does not measure past it.
WAGE_CEILING = 239200

MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def fetch(url, path):
    if os.path.exists(path):
        return
    contact = os.environ.get('BLS_CONTACT', '').strip()
    if not contact:
        sys.exit(f'{os.path.relpath(path, ROOT)} is missing. Set BLS_CONTACT to your email address to download it.')
    os.makedirs(RAW, exist_ok=True)
    request = urllib.request.Request(url, headers={'User-Agent': f'rwr-career-game ({contact})'})
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
    with open(path, 'wb') as file:
        file.write(data)
    print(f'downloaded {os.path.relpath(path, ROOT)} ({len(data):,} bytes)')


def column(ref):
    number = 0
    for letter in re.match(r'[A-Z]+', ref).group():
        number = number * 26 + ord(letter) - 64
    return number - 1


def sheets(workbook):
    """Every sheet of an .xlsx file as rows of text cells, read with the standard library."""
    book = zipfile.ZipFile(workbook)
    shared = []
    if 'xl/sharedStrings.xml' in book.namelist():
        for item in ET.fromstring(book.read('xl/sharedStrings.xml')).findall(f'{{{MAIN}}}si'):
            shared.append(''.join(text.text or '' for text in item.iter(f'{{{MAIN}}}t')))
    targets = {rel.get('Id'): rel.get('Target') for rel in ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))}
    found = {}
    for sheet in ET.fromstring(book.read('xl/workbook.xml')).find(f'{{{MAIN}}}sheets'):
        target = targets[sheet.get(f'{{{RELS}}}id')]
        target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        rows = []
        for row in ET.fromstring(book.read(target)).iter(f'{{{MAIN}}}row'):
            cells = {}
            for cell in row.findall(f'{{{MAIN}}}c'):
                value = cell.find(f'{{{MAIN}}}v')
                if cell.get('t') == 'inlineStr':
                    text = ''.join(part.text or '' for part in cell.iter(f'{{{MAIN}}}t'))
                elif value is None:
                    continue
                elif cell.get('t') == 's':
                    text = shared[int(value.text)]
                else:
                    text = value.text
                cells[column(cell.get('r'))] = text
            rows.append([cells.get(index, '') for index in range(max(cells) + 1)] if cells else [])
        found[sheet.get('name')] = rows
    return found


def dollars(text):
    """A yearly wage as whole dollars, or None where BLS gives none."""
    text = (text or '').strip().replace(',', '')
    if text == '#':
        return WAGE_CEILING
    try:
        return round(float(text))
    except ValueError:
        return None


def number(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def none_to_empty(text):
    text = (text or '').strip()
    return '' if text in ('None', '—') else text


def main():
    fetch(PROJECTIONS_URL, PROJECTIONS_FILE)
    fetch(WAGES_URL, WAGES_FILE)

    table = sheets(PROJECTIONS_FILE)['Table 1.2']
    head = table[1]
    at = {name: next(index for index, title in enumerate(head) if title.startswith(name)) for name in (
        'Occupation type', 'Employment change, percent', 'Occupational openings', 'Median annual wage',
        'Typical education', 'Work experience', 'Typical on-the-job training',
    )}
    span = re.search(r'(\d{4})–(\d{2})', head[at['Employment change, percent']])
    projected = {'from': int(span.group(1)), 'to': int(span.group(1)[:2] + span.group(2))}

    archive = zipfile.ZipFile(WAGES_FILE)
    wages_name = next(name for name in archive.namelist() if name.endswith('.xlsx'))
    wage_rows = next(iter(sheets(io.BytesIO(archive.read(wages_name))).values()))
    wage_at = {title: index for index, title in enumerate(wage_rows[0])}
    quarters = {
        row[wage_at['OCC_CODE']]: (dollars(row[wage_at['A_PCT25']]), dollars(row[wage_at['A_PCT75']]))
        for row in wage_rows[1:]
        if row and row[wage_at['O_GROUP']] == 'detailed'
    }

    groups = []
    occupations = []
    all_jobs_growth = None
    for row in table[2:]:
        if len(row) <= at['Typical on-the-job training']:
            continue
        title, code, kind = row[0].strip(), row[1].strip(), row[at['Occupation type']]
        growth = number(row[at['Employment change, percent']])
        if code == '00-0000':
            all_jobs_growth = round(growth, 1)
        elif kind == 'Summary' and code.endswith('-0000'):
            groups.append({'code': code[:2], 'name': re.sub(r' occupations$', '', title)})
        if kind != 'Line item':
            continue
        median = dollars(row[at['Median annual wage']])
        low, high = quarters.get(code, (None, None))
        openings = number(row[at['Occupational openings']])
        # An occupation with no yearly wage cannot be checked against what a player needs, and
        # the "all other" lines are leftovers, not work anyone can look up.
        if median is None or low is None or high is None or growth is None or openings is None:
            continue
        if 'all other' in title.lower():
            continue
        occupations.append({
            'code': code,
            'title': title,
            'median': median,
            'low': low,
            'high': high,
            'education': none_to_empty(row[at['Typical education']]),
            'experience': none_to_empty(row[at['Work experience']]),
            'training': none_to_empty(row[at['Typical on-the-job training']]),
            'growth': round(growth, 1),
            # BLS counts openings in thousands a year.
            'openings': round(openings * 1000),
        })

    data = {
        'source': {
            'name': 'U.S. Bureau of Labor Statistics',
            'wageYear': WAGE_YEAR,
            'projected': projected,
            'allJobsGrowth': all_jobs_growth,
        },
        'groups': groups,
        'occupations': occupations,
    }
    with open(OUT, 'w') as file:
        json.dump(data, file, ensure_ascii=False, separators=(',', ':'))
        file.write('\n')
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(occupations)} occupations in {len(groups)} groups')


if __name__ == '__main__':
    main()

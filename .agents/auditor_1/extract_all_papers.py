import re
import glob

base_dir = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening'
md_files = sorted(glob.glob(f'{base_dir}/**/*.md', recursive=True))

papers = []
for f in md_files:
    content = open(f, 'r', encoding='utf-8').read()
    # Find lines mentioning papers, arXiv, conferences, models, benchmarks
    for line_num, line in enumerate(content.splitlines(), 1):
        if any(term in line.lower() for term in ['arxiv', 'cvpr', 'iccv', 'eccv', 'icdar', 'tpami', 'neurips', 'iclr', 'ieee', 'acm', 'benchmark', 'dataset', 'et al', 'github.com']):
            papers.append((f.split('/')[-1], line_num, line.strip()))

print(f"Total academic/benchmark references located: {len(papers)}")
for p in papers:
    print(f"[{p[0]}:{p[1]}] {p[2]}")


from pathlib import Path
from html import escape
import re

root = Path(__file__).parent
source = next(root.glob('*.md'))
def inline(t):
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', escape(t))
parts=[]; table=False
for line in source.read_text(encoding='utf-8').splitlines():
    if line.startswith('|'):
        if re.match(r'^\|[\s|:-]+$',line): continue
        cells=line.strip('|').split('|')
        if not table: parts.append('<table><thead><tr>'+''.join('<th>'+inline(c.strip())+'</th>' for c in cells)+'</tr></thead><tbody>'); table=True
        else: parts.append('<tr>'+''.join('<td>'+inline(c.strip())+'</td>' for c in cells)+'</tr>')
        continue
    if table: parts.append('</tbody></table>');table=False
    if line.startswith('# '): parts.append('<h1>'+inline(line[2:])+'</h1>')
    elif line.startswith('## '): parts.append('<h2>'+inline(line[3:])+'</h2>')
    elif line: parts.append('<p>'+inline(line)+'</p>')
if table:parts.append('</tbody></table>')
style='''body{font:15px/1.6 Arial,sans-serif;color:#20242b;max-width:1040px;margin:48px auto;padding:0 28px}h1{font-size:32px}h2{font-size:22px;margin-top:36px;color:#7d2e30}table{width:100%;border-collapse:collapse;font-size:13px;margin:20px 0}td,th{padding:10px;border:1px solid #dce0e5;text-align:left;vertical-align:top}th{background:#f4f6f8}p{margin:10px 0}@media print{body{margin:0;font-size:11px}table{font-size:10px}h2{break-after:avoid}tr{break-inside:avoid}}'''
(root/'CuppA-training-plan.html').write_text('<!doctype html><html lang="mn"><meta charset="utf-8"><title>CuppA — Сургалтын төлөвлөгөө</title><style>'+style+'</style><body>'+''.join(parts)+'</body></html>',encoding='utf-8')
print('Printable training plan created')

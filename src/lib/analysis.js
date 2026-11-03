// Explicitly simulated keyword analysis. No AI service or speech recognition is called.
export function analyze(text,keywords='预算,用途,时间') {
 const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
 const dimensions=keywords.split(/[,，]/).map(x=>x.trim()).filter(Boolean).slice(0,8);
 const matches={预算:/预算|万元|万左右|多少钱|价格/,用途:/用途|通勤|家用|出行|接送/,时间:/购车时间|什么时候|本月|下个月|月底|提车/,试驾:/试驾|体验/,跟进:/联系|跟进|微信|电话/};
 const findings=dimensions.map(d=>{const re=matches[d];const idx=lines.findIndex(l=>re?re.test(l):l.includes(d));const found=idx>=0;return {dimension:d,verdict:found?`对话中提及「${d}」，需复核是否充分确认`:`未检索到「${d}」相关表述，建议核查完整上下文`,evidence:found?lines[idx]:lines.slice(0,2).join('\n'),line_index:found?idx:0,confidence:found?82:54};});
 const score=Math.round(findings.filter(f=>f.confidence===82).length/Math.max(1,findings.length)*100);
 return {score,summary:`模拟规则分析：覆盖 ${findings.filter(f=>f.confidence===82).length}/${findings.length} 个关键词维度。此结果只反映文字关键词覆盖，不代表销售能力或客户意向；结论须经人工复核。`,findings};
}

// 测试正则表达式匹配行为

const input = 'a/b+c';

const patterns = [
  { regex: /\(([^()]+)\)\/\(([^()]+)\)/g, name: 'Pattern 1: (expr)/(expr)' },
  { regex: /\(([^()]+)\)\/([a-zA-Z0-9]+)(?=[+\-*/^_\s]|$)/g, name: 'Pattern 2: (expr)/word' },
  { regex: /([a-zA-Z0-9]+)\/\(([^()]+)\)/g, name: 'Pattern 3: word/(expr)' },
  { regex: /(?:^|[+\-*/^_\s(])([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)(?=[+\-*/^_\s)]|$)/g, name: 'Pattern 4: word/word' },
];

console.log(`测试输入: "${input}"`);
console.log('');

for (const { regex, name } of patterns) {
  console.log(`${name}:`);
  let match;
  let count = 0;
  
  while ((match = regex.exec(input)) !== null) {
    count++;
    console.log(`  匹配 #${count}:`);
    console.log(`    fullMatch: "${match[0]}"`);
    console.log(`    index: ${match.index}`);
    console.log(`    numerator: "${match[1]}"`);
    console.log(`    denominator: "${match[2]}"`);
    console.log(`    match[0].length: ${match[0].length}`);
    
    // 计算 range
    let startOffset = 0;
    if (match[0].length > 0 && !/[a-zA-Z0-9(]/.test(match[0][0])) {
      startOffset = 1;
    }
    
    const start = match.index + startOffset;
    const end = match.index + match[0].length;
    
    console.log(`    计算的 range: [${start}, ${end}]`);
    console.log(`    提取的文本: "${input.substring(start, end)}"`);
  }
  
  if (count === 0) {
    console.log('  无匹配');
  }
  console.log('');
}

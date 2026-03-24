import { promises as fs } from 'fs';
import path from 'path';

// Resolve project root correctly when this script is run from workspace root
const ROOT = path.resolve(process.cwd(), 'ekart-react');
const SRC = path.join(ROOT, 'src');

const exts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.json'];

async function walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for(const e of entries){
    const res = path.join(dir, e.name);
    if(e.isDirectory()) files.push(...await walk(res));
    else if(/\.(js|jsx|ts|tsx|css|json)$/.test(e.name)) files.push(res);
  }
  return files;
}

function extractImports(content){
  // strip single-line and multi-line comments to avoid false positives
  const withoutComments = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const imports = [];
  const importRegex = /import\s+(?:[^'";]+from\s+)?['"]([^'"\\)]+)['"]/g;
  let m; while((m=importRegex.exec(withoutComments))){ imports.push(m[1]); }
  // also require('x') style
  const reqRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  while((m=reqRegex.exec(withoutComments))){ imports.push(m[1]); }
  return imports;
}

async function fileExistsTry(p){
  try{ await fs.access(p); return true;}catch{return false}
}

async function resolveImport(fromFile, spec){
  if(spec.startsWith('.') || spec.startsWith('/')){
    // local path
    const base = spec.startsWith('/') ? path.join(ROOT, spec) : path.resolve(path.dirname(fromFile), spec);
    // try with extensions and index files
    if(await fileExistsTry(base)) return base;
    for(const ex of exts){ if(await fileExistsTry(base+ex)) return base+ex }
    for(const ex of exts){ if(await fileExistsTry(path.join(base,'index'+ex))) return path.join(base,'index'+ex) }
    return null;
  }
  // package import, ignore
  return 'PACKAGE';
}

async function main(){
  const files = await walk(SRC);
  const unresolved = [];
  for(const f of files){
    const content = await fs.readFile(f,'utf8');
    const imports = extractImports(content);
    for(const spec of imports){
      const res = await resolveImport(f, spec);
      if(res === null){ unresolved.push({file:f, spec}); }
    }
  }
  if(unresolved.length===0){
    console.log('No unresolved relative/absolute imports found.');
    return;
  }
  console.log('Unresolved imports:');
  for(const u of unresolved) console.log('-', path.relative(ROOT,u.file), '->', u.spec);
}

main().catch(err=>{ console.error(err); process.exit(2) });

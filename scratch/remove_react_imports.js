import fs from 'fs';
import path from 'path';

const SRC_DIR = '/Users/deniskisiluk/Desktop/polonez-delivery/src';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Match import React, { ... } from 'react';
  // Replace with import { ... } from 'react';
  content = content.replace(/import\s+React\s*,\s*({[^}]+})\s+from\s+(['"])react\2;?/g, 'import $1 from $2;');

  // 2. Match import React from 'react';
  // Delete completely
  content = content.replace(/import\s+React\s+from\s+(['"])react\1;?\r?\n?/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Cleaned React import in: ${path.relative(SRC_DIR, filePath)}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

traverse(SRC_DIR);
console.log('React 19 imports cleanup completed!');

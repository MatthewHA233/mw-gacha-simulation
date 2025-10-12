#!/usr/bin/env node
/**
 * 从 src/utils/version.js 提取数据到 CDN 配置文件
 *
 * 生成文件：
 * - public/gacha-configs/version-history.json - 版本历史数据
 * - public/gacha-configs/site-info.json - 网站信息、致谢、赞赏者
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入版本数据
const {
  APP_VERSION,
  SITE_INFO,
  VERSION_RULES,
  VERSION_DETAILS,
  VERSION_STATS
} = await import('../src/utils/version.js');

// 路径配置
const outputDir = path.join(__dirname, '../public/gacha-configs');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 生成 site-info.json
const siteInfoData = {
  siteInfo: SITE_INFO,
  lastUpdated: new Date().toISOString().split('T')[0]
};

const siteInfoPath = path.join(outputDir, 'site-info.json');
console.log(`Writing: ${siteInfoPath}`);
fs.writeFileSync(
  siteInfoPath,
  JSON.stringify(siteInfoData, null, 2),
  'utf-8'
);

// 生成 version-history.json
const versionHistoryData = {
  currentVersion: APP_VERSION,
  versionRules: VERSION_RULES,
  versionDetails: VERSION_DETAILS,
  versionStats: VERSION_STATS,
  lastUpdated: new Date().toISOString().split('T')[0]
};

const versionHistoryPath = path.join(outputDir, 'version-history.json');
console.log(`Writing: ${versionHistoryPath}`);
fs.writeFileSync(
  versionHistoryPath,
  JSON.stringify(versionHistoryData, null, 2),
  'utf-8'
);

// 统计信息
const siteInfoSize = fs.statSync(siteInfoPath).size;
const versionHistorySize = fs.statSync(versionHistoryPath).size;

console.log('\n✅ Data extraction completed!');
console.log(`  - site-info.json: ${(siteInfoSize / 1024).toFixed(2)} KB`);
console.log(`  - version-history.json: ${(versionHistorySize / 1024).toFixed(2)} KB`);
console.log(`\n📊 Statistics:`);
console.log(`  - Current version: ${APP_VERSION}`);
console.log(`  - Total versions: ${VERSION_DETAILS.length}`);
console.log(`  - Sponsors: ${SITE_INFO.sponsors.length} people`);

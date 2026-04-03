#!/usr/bin/env python3
"""
阿里云 OSS 资源管理脚本
统一管理配置文件和静态资源的上传

依赖安装:
  pip install oss2 python-dotenv

使用方法:
  python scripts/upload-to-oss.py
"""

import os
import sys
import json
import hashlib
import mimetypes
from pathlib import Path

# 清除代理环境变量，防止本地代理干扰 OSS 连接
for _k in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'):
    os.environ.pop(_k, None)

import oss2
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# OSS 配置（从环境变量读取）
ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID')
ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET')
ENDPOINT = os.getenv('OSS_ENDPOINT', 'oss-cn-hangzhou.aliyuncs.com')
BUCKET_NAME = os.getenv('OSS_BUCKET_NAME')
PATH_PREFIX = os.getenv('OSS_PATH_PREFIX', '')  # 例如: mw-gacha-simulation

# 验证配置
if not all([ACCESS_KEY_ID, ACCESS_KEY_SECRET, BUCKET_NAME]):
    print("❌ 错误：缺少 OSS 配置")
    print("请在 .env 文件中配置以下变量：")
    print("  OSS_ACCESS_KEY_ID=你的AccessKey")
    print("  OSS_ACCESS_KEY_SECRET=你的Secret")
    print("  OSS_BUCKET_NAME=你的Bucket名称")
    print("  OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com (可选)")
    print("  OSS_PATH_PREFIX=mw-gacha-simulation (可选)")
    sys.exit(1)

# 本地目录
LOCAL_CONFIG_DIR = Path(__file__).parent.parent / 'public' / 'gacha-configs'
LOCAL_PUBLIC_DIR = Path(__file__).parent.parent / 'public'

# OSS 上传目标路径前缀
# 如果设置了 PATH_PREFIX，则上传到: PATH_PREFIX/gacha-configs/
# 否则上传到: gacha-configs/
if PATH_PREFIX:
    OSS_PREFIX = f'{PATH_PREFIX.rstrip("/")}/gacha-configs/'
else:
    OSS_PREFIX = 'gacha-configs/'

# 不需要列举，直接扫描整个 gacha-configs 目录

# 排除的文件/目录（不上传到 OSS）
EXCLUDE_PATTERNS = [
    '.DS_Store',
    'Thumbs.db',
    '*.swp',
    '*.tmp',
    '.git',
    '.claude',
    'node_modules',
    'gacha-configs',  # 配置文件单独管理
]

# 缓存配置（根据文件类型）
CACHE_RULES = {
    '.json': 'public, max-age=0, must-revalidate',
    '.png': 'public, max-age=31536000, immutable',
    '.jpg': 'public, max-age=31536000, immutable',
    '.jpeg': 'public, max-age=31536000, immutable',
    '.webp': 'public, max-age=31536000, immutable',
    '.svg': 'public, max-age=31536000, immutable',
    '.wav': 'public, max-age=31536000, immutable',
    '.mp3': 'public, max-age=31536000, immutable',
    '.ogg': 'public, max-age=31536000, immutable',
    'default': 'public, max-age=3600',
}


def should_exclude(path):
    """检查文件是否应该被排除"""
    name = path.name
    for pattern in EXCLUDE_PATTERNS:
        if pattern.startswith('*'):
            if name.endswith(pattern[1:]):
                return True
        else:
            p = str(path).replace('\\', '/')
            if name == pattern or f'/{pattern}/' in p or p.startswith(f'{pattern}/'):
                return True
    return False


def get_cache_control(file_ext):
    """根据文件扩展名获取缓存策略"""
    return CACHE_RULES.get(file_ext.lower(), CACHE_RULES['default'])


def get_content_type(file_path):
    """获取文件的 MIME 类型"""
    content_type, _ = mimetypes.guess_type(str(file_path))
    return content_type or 'application/octet-stream'


def upload_config_file(bucket, local_path, oss_path):
    """上传配置文件（JSON）"""
    try:
        with open(local_path, 'r', encoding='utf-8') as f:
            content = f.read()
        json.loads(content)  # 验证 JSON

        bucket.put_object(
            oss_path,
            content.encode('utf-8'),
            headers={
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, max-age=0, must-revalidate',
            }
        )
        print(f"✅ {local_path.name} → {oss_path}")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ {local_path.name}: JSON 格式错误 - {e}")
        return False
    except Exception as e:
        print(f"❌ {local_path.name}: 上传失败 - {e}")
        return False


def upload_static_file(bucket, local_path, oss_path):
    """上传静态资源文件"""
    try:
        file_ext = local_path.suffix
        headers = {
            'Content-Type': get_content_type(local_path),
            'Cache-Control': get_cache_control(file_ext),
        }

        with open(local_path, 'rb') as f:
            bucket.put_object(oss_path, f, headers=headers)

        size_kb = local_path.stat().st_size / 1024
        print(f"✅ {local_path.name} ({size_kb:.1f} KB)")
        return True
    except Exception as e:
        print(f"❌ {local_path.name}: {e}")
        return False


def scan_local_files(base_dir):
    """扫描本地文件"""
    files = {}
    for file_path in base_dir.rglob('*'):
        if file_path.is_file() and not should_exclude(file_path):
            rel_path = file_path.relative_to(base_dir)
            files[str(rel_path).replace('\\', '/')] = {
                'path': file_path,
                'size': file_path.stat().st_size,
            }
    return files


def scan_oss_files(bucket, prefix):
    """扫描 OSS 上的文件"""
    files = {}
    try:
        for obj in oss2.ObjectIterator(bucket, prefix=prefix):
            rel_path = obj.key[len(prefix):].lstrip('/')
            files[rel_path] = {'size': obj.size}
    except:
        pass
    return files


def upload_configs(bucket, auto_confirm=False):
    """功能1: 覆盖上传所有配置文件"""
    print("\n" + "=" * 70)
    print("📝 功能1: 覆盖上传所有配置文件")
    print("=" * 70 + "\n")

    # 扫描 gacha-configs 目录下的所有 JSON 文件
    print("🔍 正在扫描配置文件...")
    config_files = []
    for json_file in LOCAL_CONFIG_DIR.rglob('*.json'):
        rel_path = json_file.relative_to(LOCAL_CONFIG_DIR)
        config_files.append((json_file, rel_path))

    print(f"   找到 {len(config_files)} 个 JSON 文件\n")

    if not config_files:
        print("⚠️  未找到任何配置文件")
        return

    # 显示前10个
    print("📋 待上传文件:")
    for json_file, rel_path in config_files[:10]:
        print(f"   {rel_path}")
    if len(config_files) > 10:
        print(f"   ... 还有 {len(config_files) - 10} 个")

    # 确认上传
    if not auto_confirm:
        print()
        response = input(f"确认上传 {len(config_files)} 个配置文件？(y/N): ")
        if response.lower() != 'y':
            print("❌ 取消上传")
            return

    print("\n⏳ 开始上传...\n")
    success_count = 0
    fail_count = 0

    for i, (json_file, rel_path) in enumerate(config_files, 1):
        oss_path = OSS_PREFIX + str(rel_path).replace('\\', '/')
        print(f"[{i}/{len(config_files)}] ", end='')
        if upload_config_file(bucket, json_file, oss_path):
            success_count += 1
        else:
            fail_count += 1

    print(f"\n✅ 完成: {success_count} 个 | ❌ 失败: {fail_count} 个")


def upload_static_incremental(bucket, dry_run=False, auto_confirm=False):
    """功能2/3: 增量上传静态资源"""
    mode_text = "预览增量" if dry_run else "增量上传静态资源"
    print("\n" + "=" * 70)
    print(f"📦 功能{'3' if dry_run else '2'}: {mode_text}")
    print("=" * 70 + "\n")

    print("🔍 正在扫描本地文件...")
    local_files = scan_local_files(LOCAL_PUBLIC_DIR)
    print(f"   找到 {len(local_files)} 个文件\n")

    print("🔍 正在扫描 OSS 文件...")
    oss_prefix = f"{PATH_PREFIX}/" if PATH_PREFIX else ""
    oss_files = scan_oss_files(bucket, oss_prefix)
    print(f"   找到 {len(oss_files)} 个文件\n")

    # 对比变更
    to_upload = []
    for rel_path, local_info in local_files.items():
        if rel_path not in oss_files:
            to_upload.append((rel_path, local_info, '新增'))
        elif local_info['size'] != oss_files[rel_path]['size']:
            to_upload.append((rel_path, local_info, '修改'))

    print(f"📋 变更: {len(to_upload)} 个文件需要上传\n")

    if not to_upload:
        print("✨ 所有文件都是最新的！")
        return

    # 显示前10个
    for rel_path, info, reason in to_upload[:10]:
        size_kb = info['size'] / 1024
        print(f"   [{reason}] {rel_path} ({size_kb:.1f} KB)")
    if len(to_upload) > 10:
        print(f"   ... 还有 {len(to_upload) - 10} 个")

    if dry_run:
        return

    # 确认上传
    if not auto_confirm:
        print()
        response = input(f"确认上传 {len(to_upload)} 个文件？(y/N): ")
        if response.lower() != 'y':
            print("❌ 取消上传")
            return

    print("\n⏳ 开始上传...\n")
    success_count = 0
    for i, (rel_path, local_info, reason) in enumerate(to_upload, 1):
        oss_key = oss_prefix + rel_path
        print(f"[{i}/{len(to_upload)}] ", end='')
        if upload_static_file(bucket, local_info['path'], oss_key):
            success_count += 1

    print(f"\n✅ 完成: {success_count}/{len(to_upload)} 个文件")


def upload_all_static(bucket):
    """功能4: 覆盖上传所有静态资源"""
    print("\n" + "=" * 70)
    print("⚡ 功能4: 覆盖上传所有静态资源")
    print("=" * 70 + "\n")

    print("⚠️  警告: 这将重新上传所有文件，可能需要较长时间！")
    response = input("确认继续？(y/N): ")
    if response.lower() != 'y':
        print("❌ 取消操作")
        return

    print("\n🔍 正在扫描本地文件...")
    local_files = scan_local_files(LOCAL_PUBLIC_DIR)
    print(f"   找到 {len(local_files)} 个文件\n")

    print("⏳ 开始上传...\n")
    oss_prefix = f"{PATH_PREFIX}/" if PATH_PREFIX else ""
    success_count = 0

    for i, (rel_path, local_info) in enumerate(local_files.items(), 1):
        oss_key = oss_prefix + rel_path
        print(f"[{i}/{len(local_files)}] ", end='')
        if upload_static_file(bucket, local_info['path'], oss_key):
            success_count += 1

    print(f"\n✅ 完成: {success_count}/{len(local_files)} 个文件")


def show_menu():
    """显示交互式菜单"""
    print("\n" + "=" * 70)
    print("🚀 阿里云 OSS 资源管理")
    print("=" * 70)
    print(f"\n📦 Bucket: {BUCKET_NAME}")
    print(f"📍 路径前缀: {PATH_PREFIX or '(根目录)'}\n")
    print("请选择操作:")
    print("  1. 覆盖上传配置文件 (JSON)")
    print("  2. 增量上传静态资源 (图片/音频)")
    print("  3. 预览静态资源增量")
    print("  4. 覆盖上传所有静态资源")
    print("  0. 退出")
    print()


def main():
    # 命令行参数：python upload-to-oss.py incremental
    cli_action = sys.argv[1] if len(sys.argv) > 1 else None

    # 初始化 OSS
    try:
        auth = oss2.Auth(ACCESS_KEY_ID, ACCESS_KEY_SECRET)
        bucket = oss2.Bucket(auth, ENDPOINT, BUCKET_NAME)
        bucket.get_bucket_info()
    except Exception as e:
        print(f"❌ 连接 OSS 失败: {e}")
        sys.exit(1)

    # 非交互模式
    if cli_action == 'incremental':
        upload_static_incremental(bucket, dry_run=False, auto_confirm=True)
        return
    if cli_action == 'configs':
        upload_configs(bucket, auto_confirm=True)
        return

    # 交互式菜单
    while True:
        show_menu()
        choice = input("请输入选项 (0-4): ").strip()

        if choice == '1':
            upload_configs(bucket)
        elif choice == '2':
            upload_static_incremental(bucket, dry_run=False)
        elif choice == '3':
            upload_static_incremental(bucket, dry_run=True)
        elif choice == '4':
            upload_all_static(bucket)
        elif choice == '0':
            print("\n👋 再见！")
            break
        else:
            print("\n❌ 无效选项，请重新输入")

        input("\n按 Enter 继续...")


if __name__ == '__main__':
    main()

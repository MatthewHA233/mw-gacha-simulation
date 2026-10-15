#!/usr/bin/env python3
"""
配置阿里云 OSS Bucket 的 CORS 规则
允许前端跨域访问配置文件
"""

import os

# 直连 OSS，不走系统代理：系统 http_proxy 指向本地代理，且值末尾带空格会让 requests 解析失败
for _k in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'):
    os.environ.pop(_k, None)
os.environ['NO_PROXY'] = '*'
import sys
import oss2
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# OSS 配置
ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID')
ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET')
ENDPOINT = os.getenv('OSS_ENDPOINT', 'oss-cn-hangzhou.aliyuncs.com')
BUCKET_NAME = os.getenv('OSS_BUCKET_NAME')

print("=" * 60)
print("🔧 配置 OSS Bucket CORS 规则")
print("=" * 60)
print()

if not all([ACCESS_KEY_ID, ACCESS_KEY_SECRET, BUCKET_NAME]):
    print("❌ 配置不完整，请检查 .env 文件")
    sys.exit(1)

try:
    # 连接 OSS
    auth = oss2.Auth(ACCESS_KEY_ID, ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, ENDPOINT, BUCKET_NAME)

    print(f"📦 正在配置 Bucket: {BUCKET_NAME}")
    print()

    # 定义 CORS 规则
    rule = oss2.models.CorsRule(
        allowed_origins=['*'],  # 允许所有来源（生产环境建议指定域名）
        allowed_methods=['GET', 'HEAD'],  # 允许的 HTTP 方法
        allowed_headers=['*'],  # 允许的请求头
        expose_headers=['ETag', 'Content-Type'],  # 暴露的响应头
        max_age_seconds=300  # 缓存时间（5 分钟）
    )

    # 设置 CORS 规则（会覆盖现有规则）
    bucket.put_bucket_cors(oss2.models.BucketCors([rule]))

    print("✅ CORS 规则配置成功！")
    print()
    print("📋 规则详情:")
    print(f"   允许的来源: * (所有域名)")
    print(f"   允许的方法: GET, HEAD")
    print(f"   允许的头: *")
    print(f"   暴露的头: ETag, Content-Type")
    print(f"   缓存时间: 300 秒")
    print()
    print("🎉 现在可以从前端跨域访问 OSS 文件了！")
    print()

    # 显示测试地址
    print("🧪 测试地址（在浏览器打开应该能正常加载）:")
    print(f"   https://{BUCKET_NAME}.{ENDPOINT}/mw-gacha-simulation/gacha-configs/index.json")
    print()

except oss2.exceptions.AccessDenied:
    print("❌ 权限不足，请确保 AccessKey 有 PutBucketCors 权限")
    sys.exit(1)
except Exception as e:
    print(f"❌ 配置失败: {e}")
    sys.exit(1)

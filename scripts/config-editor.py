#!/usr/bin/env python3
"""
配置文件编辑器 - PyQt6 GUI
管理 version-history.json 和 site-info.json

依赖安装:
  pip install PyQt6 oss2 python-dotenv

使用方法:
  python scripts/config-editor.py
"""

import os
import sys
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QTabWidget,
    QTableWidget, QTableWidgetItem, QMessageBox, QHeaderView,
    QGroupBox, QFormLayout, QDateEdit, QComboBox, QDialog,
    QDialogButtonBox, QSpinBox, QDoubleSpinBox, QProgressDialog,
    QSplitter, QScrollArea, QFrame, QTreeWidget, QTreeWidgetItem
)
from PyQt6.QtCore import Qt, QDate, QTimer
from PyQt6.QtGui import QFont, QColor
import oss2
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 配置文件路径
PROJECT_ROOT = Path(__file__).parent.parent
VERSION_FILE = PROJECT_ROOT / 'public' / 'gacha-configs' / 'version-history.json'
SITEINFO_FILE = PROJECT_ROOT / 'public' / 'gacha-configs' / 'site-info.json'

# OSS 配置
ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID')
ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET')
ENDPOINT = os.getenv('OSS_ENDPOINT', 'oss-cn-hangzhou.aliyuncs.com')
BUCKET_NAME = os.getenv('OSS_BUCKET_NAME')
PATH_PREFIX = os.getenv('OSS_PATH_PREFIX', '')

# OSS 上传路径
if PATH_PREFIX:
    OSS_VERSION_PATH = f'{PATH_PREFIX.rstrip("/")}/gacha-configs/version-history.json'
    OSS_SITEINFO_PATH = f'{PATH_PREFIX.rstrip("/")}/gacha-configs/site-info.json'
else:
    OSS_VERSION_PATH = 'gacha-configs/version-history.json'
    OSS_SITEINFO_PATH = 'gacha-configs/site-info.json'


class SponsorDialog(QDialog):
    """赞助者添加/编辑对话框"""
    def __init__(self, sponsor_data=None, parent=None):
        super().__init__(parent)
        self.setWindowTitle('添加赞助者' if not sponsor_data else '编辑赞助者')
        self.setMinimumWidth(400)

        layout = QFormLayout()

        self.name_input = QLineEdit()
        self.amount_input = QDoubleSpinBox()
        self.amount_input.setRange(0.01, 999999)
        self.amount_input.setDecimals(2)
        self.amount_input.setValue(1.0)

        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)
        self.date_input.setDate(QDate.currentDate())

        layout.addRow('姓名:', self.name_input)
        layout.addRow('金额 (¥):', self.amount_input)
        layout.addRow('日期:', self.date_input)

        # 如果是编辑模式，填充数据
        if sponsor_data:
            self.name_input.setText(sponsor_data.get('name', ''))
            self.amount_input.setValue(sponsor_data.get('amount', 1.0))
            date_str = sponsor_data.get('date', '')
            if date_str:
                date_obj = QDate.fromString(date_str, 'yyyy-MM-dd')
                self.date_input.setDate(date_obj)

        # 按钮
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok |
            QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)

        layout.addRow(buttons)
        self.setLayout(layout)

    def get_data(self):
        """获取表单数据"""
        return {
            'name': self.name_input.text(),
            'amount': self.amount_input.value(),
            'date': self.date_input.date().toString('yyyy-MM-dd')
        }


class ConfigEditor(QMainWindow):
    def __init__(self):
        super().__init__()
        self.version_data = {}
        self.siteinfo_data = {}
        self.version_card_map = {}  # 存储版本号 -> 卡片widget 的映射
        self.init_ui()
        self.load_data()

    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle('配置文件编辑器 - 现代战舰抽奖模拟器')
        self.setGeometry(100, 100, 1000, 700)

        # 主窗口部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # 主布局 - 减少间距
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(5, 5, 5, 5)  # 减少外边距
        main_layout.setSpacing(5)  # 减少间距
        central_widget.setLayout(main_layout)

        # 标签页
        tabs = QTabWidget()
        tabs.addTab(self.create_version_tab(), '🔢 版本管理')
        tabs.addTab(self.create_siteinfo_tab(), 'ℹ️ 站点信息')
        main_layout.addWidget(tabs)

        # 底部按钮
        btn_layout = QHBoxLayout()

        self.save_local_btn = QPushButton('💾 保存到本地')
        self.save_local_btn.clicked.connect(self.save_local)

        self.upload_oss_btn = QPushButton('☁️ 上传到 OSS')
        self.upload_oss_btn.clicked.connect(self.upload_oss)

        self.reload_btn = QPushButton('🔄 重新加载')
        self.reload_btn.clicked.connect(self.load_data)

        btn_layout.addWidget(self.save_local_btn)
        btn_layout.addWidget(self.upload_oss_btn)
        btn_layout.addWidget(self.reload_btn)
        btn_layout.addStretch()

        main_layout.addLayout(btn_layout)

    def create_version_tab(self):
        """创建版本管理标签页 - 左右分栏时间线视图"""
        tab = QWidget()
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(5, 5, 5, 5)  # 减少外边距
        main_layout.setSpacing(5)  # 减少间距

        # 顶部：当前版本编辑 + 刷新按钮 - 紧凑布局
        top_layout = QHBoxLayout()
        top_layout.setSpacing(8)  # 减少元素间距

        top_layout.addWidget(QLabel('当前版本:'))
        self.current_version_input = QLineEdit()
        self.current_version_input.setPlaceholderText('例如: 1.2.6')
        self.current_version_input.setMaximumWidth(100)
        top_layout.addWidget(self.current_version_input)

        refresh_timeline_btn = QPushButton('🔄 刷新时间线')
        refresh_timeline_btn.clicked.connect(self.refresh_timeline)
        top_layout.addWidget(refresh_timeline_btn)

        top_layout.addStretch()

        # 统计信息标签
        self.git_stats_label = QLabel('点击刷新按钮加载时间线')
        self.git_stats_label.setStyleSheet('color: #333; padding: 2px;')  # 改为深色
        top_layout.addWidget(self.git_stats_label)

        main_layout.addLayout(top_layout)

        # 中间：左右分栏视图 - 设置拉伸因子让它占据所有剩余空间
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # 左侧：版本历史卡片
        left_widget = QWidget()
        left_layout = QVBoxLayout()
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(0)

        left_header = QLabel('📋 版本历史')
        left_header.setStyleSheet('font-weight: bold; font-size: 13px; padding: 6px; background: #e8f4f8; color: #000;')
        left_layout.addWidget(left_header)

        # 版本卡片滚动区域
        self.version_scroll = QScrollArea()
        self.version_scroll.setWidgetResizable(True)
        self.version_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        self.version_cards_widget = QWidget()
        self.version_cards_layout = QVBoxLayout()
        self.version_cards_layout.setSpacing(8)  # 减少卡片间距
        self.version_cards_layout.setContentsMargins(5, 5, 5, 5)
        self.version_cards_widget.setLayout(self.version_cards_layout)

        self.version_scroll.setWidget(self.version_cards_widget)
        left_layout.addWidget(self.version_scroll)

        left_widget.setLayout(left_layout)

        # 右侧：Git 提交时间线
        right_widget = QWidget()
        right_layout = QVBoxLayout()
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(0)

        right_header = QLabel('🔀 Git 提交时间线')
        right_header.setStyleSheet('font-weight: bold; font-size: 13px; padding: 6px; background: #f8f4e8; color: #000;')
        right_layout.addWidget(right_header)

        # Git 时间线滚动区域
        self.git_scroll = QScrollArea()
        self.git_scroll.setWidgetResizable(True)
        self.git_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        self.git_timeline_widget = QWidget()
        self.git_timeline_layout = QVBoxLayout()
        self.git_timeline_layout.setSpacing(3)  # 减少时间线条目间距
        self.git_timeline_layout.setContentsMargins(5, 5, 5, 5)
        self.git_timeline_widget.setLayout(self.git_timeline_layout)

        self.git_scroll.setWidget(self.git_timeline_widget)
        right_layout.addWidget(self.git_scroll)

        right_widget.setLayout(right_layout)

        # 添加到分割器
        splitter.addWidget(left_widget)
        splitter.addWidget(right_widget)
        splitter.setStretchFactor(0, 6)  # 左侧占 60%
        splitter.setStretchFactor(1, 4)  # 右侧占 40%

        # 关键：设置拉伸因子为 1，让 splitter 占据所有剩余垂直空间
        main_layout.addWidget(splitter, 1)

        tab.setLayout(main_layout)
        return tab

    def create_siteinfo_tab(self):
        """创建站点信息标签页"""
        tab = QWidget()
        layout = QVBoxLayout()

        # 基本信息
        basic_group = QGroupBox('基本信息')
        basic_layout = QFormLayout()

        self.site_name_input = QLineEdit()
        self.site_name_en_input = QLineEdit()
        self.site_desc_input = QLineEdit()
        self.site_author_input = QLineEdit()
        self.site_github_input = QLineEdit()

        basic_layout.addRow('网站名称:', self.site_name_input)
        basic_layout.addRow('英文名称:', self.site_name_en_input)
        basic_layout.addRow('描述:', self.site_desc_input)
        basic_layout.addRow('作者:', self.site_author_input)
        basic_layout.addRow('GitHub:', self.site_github_input)

        basic_group.setLayout(basic_layout)
        layout.addWidget(basic_group)

        # 赞助者列表
        sponsor_group = QGroupBox('赞助者列表')
        sponsor_layout = QVBoxLayout()

        # 按钮
        sponsor_btn_layout = QHBoxLayout()
        add_sponsor_btn = QPushButton('➕ 添加赞助者')
        add_sponsor_btn.clicked.connect(self.add_sponsor)
        edit_sponsor_btn = QPushButton('✏️ 编辑选中')
        edit_sponsor_btn.clicked.connect(self.edit_sponsor)
        remove_sponsor_btn = QPushButton('🗑️ 删除选中')
        remove_sponsor_btn.clicked.connect(self.remove_sponsor)

        sponsor_btn_layout.addWidget(add_sponsor_btn)
        sponsor_btn_layout.addWidget(edit_sponsor_btn)
        sponsor_btn_layout.addWidget(remove_sponsor_btn)
        sponsor_btn_layout.addStretch()

        sponsor_layout.addLayout(sponsor_btn_layout)

        # 表格
        self.sponsor_table = QTableWidget()
        self.sponsor_table.setColumnCount(3)
        self.sponsor_table.setHorizontalHeaderLabels(['姓名', '金额 (¥)', '日期'])
        self.sponsor_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        sponsor_layout.addWidget(self.sponsor_table)

        sponsor_group.setLayout(sponsor_layout)
        layout.addWidget(sponsor_group)

        tab.setLayout(layout)
        return tab

    def load_data(self):
        """加载配置文件"""
        try:
            # 加载版本历史
            with open(VERSION_FILE, 'r', encoding='utf-8') as f:
                self.version_data = json.load(f)

            # 加载站点信息
            with open(SITEINFO_FILE, 'r', encoding='utf-8') as f:
                self.siteinfo_data = json.load(f)

            self.update_ui()
            QMessageBox.information(self, '成功', '配置文件加载成功')

        except Exception as e:
            QMessageBox.critical(self, '错误', f'加载配置文件失败:\n{e}')

    def update_ui(self):
        """更新界面显示"""
        # 更新版本信息
        self.current_version_input.setText(self.version_data.get('currentVersion', ''))

        # 更新站点信息
        site_info = self.siteinfo_data.get('siteInfo', {})
        self.site_name_input.setText(site_info.get('name', ''))
        self.site_name_en_input.setText(site_info.get('nameEn', ''))
        self.site_desc_input.setText(site_info.get('description', ''))
        self.site_author_input.setText(site_info.get('author', ''))
        self.site_github_input.setText(site_info.get('github', ''))

        # 更新赞助者列表
        self.update_sponsor_table()

    def update_sponsor_table(self):
        """更新赞助者表格"""
        sponsors = self.siteinfo_data.get('siteInfo', {}).get('sponsors', [])
        self.sponsor_table.setRowCount(len(sponsors))

        for i, sponsor in enumerate(sponsors):
            self.sponsor_table.setItem(i, 0, QTableWidgetItem(sponsor.get('name', '')))
            self.sponsor_table.setItem(i, 1, QTableWidgetItem(str(sponsor.get('amount', 0))))
            self.sponsor_table.setItem(i, 2, QTableWidgetItem(sponsor.get('date', '')))

    def add_sponsor(self):
        """添加赞助者"""
        dialog = SponsorDialog(parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            sponsor_data = dialog.get_data()

            if not sponsor_data['name']:
                QMessageBox.warning(self, '警告', '姓名不能为空')
                return

            self.siteinfo_data.setdefault('siteInfo', {}).setdefault('sponsors', []).append(sponsor_data)
            self.update_sponsor_table()
            QMessageBox.information(self, '成功', '赞助者添加成功（记得保存）')

    def edit_sponsor(self):
        """编辑赞助者"""
        current_row = self.sponsor_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, '警告', '请先选择一个赞助者')
            return

        sponsors = self.siteinfo_data.get('siteInfo', {}).get('sponsors', [])
        if current_row >= len(sponsors):
            return

        dialog = SponsorDialog(sponsor_data=sponsors[current_row], parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            sponsors[current_row] = dialog.get_data()
            self.update_sponsor_table()
            QMessageBox.information(self, '成功', '赞助者更新成功（记得保存）')

    def remove_sponsor(self):
        """删除赞助者"""
        current_row = self.sponsor_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, '警告', '请先选择一个赞助者')
            return

        reply = QMessageBox.question(
            self, '确认删除',
            '确定要删除该赞助者吗？',
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            sponsors = self.siteinfo_data.get('siteInfo', {}).get('sponsors', [])
            if current_row < len(sponsors):
                sponsors.pop(current_row)
                self.update_sponsor_table()
                QMessageBox.information(self, '成功', '赞助者删除成功（记得保存）')

    def collect_data(self):
        """收集界面数据"""
        # 更新版本数据
        self.version_data['currentVersion'] = self.current_version_input.text()
        self.version_data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')

        # 更新站点信息数据
        site_info = self.siteinfo_data.setdefault('siteInfo', {})
        site_info['name'] = self.site_name_input.text()
        site_info['nameEn'] = self.site_name_en_input.text()
        site_info['description'] = self.site_desc_input.text()
        site_info['author'] = self.site_author_input.text()
        site_info['github'] = self.site_github_input.text()
        site_info['currentVersion'] = self.current_version_input.text()

        self.siteinfo_data['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')

    def save_local(self):
        """保存到本地文件"""
        try:
            self.collect_data()

            # 保存 version-history.json
            with open(VERSION_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.version_data, f, ensure_ascii=False, indent=2)

            # 保存 site-info.json
            with open(SITEINFO_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.siteinfo_data, f, ensure_ascii=False, indent=2)

            QMessageBox.information(self, '成功', '✅ 配置文件已保存到本地')

        except Exception as e:
            QMessageBox.critical(self, '错误', f'保存失败:\n{e}')

    def upload_oss(self):
        """上传到 OSS"""
        if not all([ACCESS_KEY_ID, ACCESS_KEY_SECRET, BUCKET_NAME]):
            QMessageBox.critical(
                self, '错误',
                '❌ OSS 配置不完整\n请检查 .env 文件中的配置'
            )
            return

        try:
            # 先保存到本地
            self.collect_data()

            # 连接 OSS
            auth = oss2.Auth(ACCESS_KEY_ID, ACCESS_KEY_SECRET)
            bucket = oss2.Bucket(auth, ENDPOINT, BUCKET_NAME)

            # 上传 version-history.json
            version_content = json.dumps(self.version_data, ensure_ascii=False, indent=2)
            bucket.put_object(
                OSS_VERSION_PATH,
                version_content.encode('utf-8'),
                headers={
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'public, max-age=0, must-revalidate',
                }
            )

            # 上传 site-info.json
            siteinfo_content = json.dumps(self.siteinfo_data, ensure_ascii=False, indent=2)
            bucket.put_object(
                OSS_SITEINFO_PATH,
                siteinfo_content.encode('utf-8'),
                headers={
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'public, max-age=0, must-revalidate',
                }
            )

            # 同时保存到本地
            with open(VERSION_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.version_data, f, ensure_ascii=False, indent=2)

            with open(SITEINFO_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.siteinfo_data, f, ensure_ascii=False, indent=2)

            QMessageBox.information(
                self, '成功',
                '✅ 配置文件已上传到 OSS\n✅ 同时已保存到本地'
            )

        except Exception as e:
            QMessageBox.critical(self, '错误', f'上传失败:\n{e}')

    def refresh_timeline(self):
        """刷新时间线视图"""
        try:
            # 显示进度对话框
            progress = QProgressDialog('正在加载时间线...', '取消', 0, 0, self)
            progress.setWindowModality(Qt.WindowModality.WindowModal)
            progress.setMinimumDuration(0)
            progress.setValue(0)
            QApplication.processEvents()

            # 清空现有内容
            self.clear_timeline()

            # 获取 Git 提交历史
            progress.setLabelText('正在获取 Git 提交...')
            QApplication.processEvents()
            git_commits = self.get_git_commits()

            # 获取版本历史数据
            version_details = self.version_data.get('versionDetails', [])

            # 构建 hash -> version 的映射
            hash_to_version = {}
            for version in version_details:
                for commit in version.get('commits', []):
                    hash_val = commit.get('hash', '').strip()
                    if hash_val:
                        hash_to_version[hash_val] = version

            # 构建已记录的 hash 集合
            recorded_hashes = set(hash_to_version.keys())

            # 渲染左侧版本卡片
            progress.setLabelText('正在渲染版本卡片...')
            QApplication.processEvents()
            for version in version_details:
                card = self.create_version_card(version)
                self.version_cards_layout.addWidget(card)
                # 存储版本号和卡片的映射
                version_number = version.get('version', '')
                if version_number:
                    self.version_card_map[version_number] = card

            self.version_cards_layout.addStretch()

            # 渲染右侧 Git 时间线
            progress.setLabelText('正在渲染 Git 时间线...')
            QApplication.processEvents()

            missing_count = 0
            for commit in git_commits:
                is_recorded = commit['hash'] in recorded_hashes
                version_info = hash_to_version.get(commit['hash'])

                item = self.create_git_commit_item(commit, is_recorded, version_info)
                self.git_timeline_layout.addWidget(item)

                if not is_recorded:
                    missing_count += 1

            self.git_timeline_layout.addStretch()

            progress.close()

            # 更新统计信息
            total = len(git_commits)
            recorded = total - missing_count

            if missing_count > 0:
                stats_text = (
                    f'📈 总提交 {total} | '
                    f'已记录 {recorded} | '
                    f'<span style="color: red; font-weight: bold;">缺失 {missing_count}</span>'
                )
                self.git_stats_label.setText(stats_text)
            else:
                stats_text = f'📈 总提交 {total} | 已记录 {recorded} | ✅ 无缺失'
                self.git_stats_label.setText(stats_text)

        except Exception as e:
            progress.close()
            QMessageBox.critical(self, '错误', f'刷新时间线失败:\n{e}')

    def clear_timeline(self):
        """清空时间线"""
        # 清空版本卡片映射
        self.version_card_map.clear()

        # 清空左侧版本卡片
        while self.version_cards_layout.count():
            item = self.version_cards_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        # 清空右侧 Git 时间线
        while self.git_timeline_layout.count():
            item = self.git_timeline_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

    def create_version_card(self, version):
        """创建版本卡片"""
        card = QFrame()
        card.setFrameShape(QFrame.Shape.StyledPanel)
        card.setStyleSheet("""
            QFrame {
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 8px;
            }
            QFrame:hover {
                border: 2px solid #3b82f6;
            }
        """)

        layout = QVBoxLayout()
        layout.setSpacing(4)  # 减少间距
        layout.setContentsMargins(8, 8, 8, 8)

        # 版本号和日期
        header_layout = QHBoxLayout()

        version_label = QLabel(f"<b style='font-size: 16px; color: #000;'>v{version.get('version', '')}</b>")
        header_layout.addWidget(version_label)

        date_label = QLabel(version.get('date', ''))
        date_label.setStyleSheet('color: #555;')
        header_layout.addWidget(date_label)

        # 类型标签
        type_val = version.get('type', 'patch')
        type_colors = {
            'major': '#ef4444',
            'minor': '#3b82f6',
            'patch': '#10b981'
        }
        type_label = QLabel(type_val.upper())
        type_label.setStyleSheet(f"""
            background: {type_colors.get(type_val, '#999')};
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
        """)
        header_layout.addWidget(type_label)

        header_layout.addStretch()
        layout.addLayout(header_layout)

        # 主题
        theme = version.get('theme', '')
        if theme:
            theme_label = QLabel(f"📌 {theme}")
            theme_label.setStyleSheet('color: #000; font-weight: bold;')
            layout.addWidget(theme_label)

        # Commits
        commits = version.get('commits', [])
        if commits:
            commits_label = QLabel(f"<b style='color: #333;'>Commits ({len(commits)}):</b>")
            layout.addWidget(commits_label)

            for commit in commits:
                hash_val = commit.get('hash', '')
                message = commit.get('message', '')
                commit_text = QLabel(f"  • <code style='background: #e0e0e0; padding: 2px 4px; color: #000;'>{hash_val}</code> <span style='color: #333;'>{message}</span>")
                commit_text.setWordWrap(True)
                commit_text.setStyleSheet('font-size: 12px;')
                layout.addWidget(commit_text)

        # Features
        features = version.get('features', [])
        if features and len(features) <= 5:  # 只显示前5个特性
            features_label = QLabel(f"<b style='color: #333;'>特性:</b>")
            layout.addWidget(features_label)

            for feature in features[:5]:
                feature_label = QLabel(f"  ✓ {feature}")
                feature_label.setWordWrap(True)
                feature_label.setStyleSheet('color: #333; font-size: 12px;')
                layout.addWidget(feature_label)

        card.setLayout(layout)
        return card

    def create_git_commit_item(self, commit, is_recorded, version_info=None):
        """创建 Git 提交时间线条目"""
        item = QFrame()
        item.setFrameShape(QFrame.Shape.StyledPanel)

        if is_recorded:
            # 已记录 - 绿色边框
            bg_color = '#e8f8e8'
            border_color = '#10b981'
            status_icon = '✅'
            # 使用可点击的链接
            if version_info:
                version_number = version_info.get('version', '')
                version_text = f"<br><small style='color: #0d7c59; font-weight: bold;'><a href='#{version_number}' style='color: #0d7c59; text-decoration: underline;'>→ v{version_number}</a></small>"
            else:
                version_text = ''
        else:
            # 未记录 - 红色边框，高亮
            bg_color = '#ffe8e8'
            border_color = '#ef4444'
            status_icon = '❌'
            version_text = '<br><small style="color: #dc2626; font-weight: bold;">未记录</small>'

        item.setStyleSheet(f"""
            QFrame {{
                background: {bg_color};
                border-left: 4px solid {border_color};
                padding: 6px;
                margin: 1px;
            }}
        """)

        layout = QVBoxLayout()
        layout.setSpacing(2)
        layout.setContentsMargins(4, 4, 4, 4)

        # Hash + 状态
        hash_label = QLabel(
            f"{status_icon} <code style='background: rgba(0,0,0,0.15); padding: 2px 6px; color: #000;'>{commit['hash']}</code>{version_text}"
        )
        hash_label.setWordWrap(True)
        hash_label.setTextFormat(Qt.TextFormat.RichText)
        hash_label.setOpenExternalLinks(False)  # 不打开外部链接
        hash_label.linkActivated.connect(self.on_version_link_clicked)  # 连接点击事件
        layout.addWidget(hash_label)

        # 提交信息
        message_label = QLabel(commit['message'])
        message_label.setWordWrap(True)
        message_label.setStyleSheet('color: #000; font-size: 12px;')
        layout.addWidget(message_label)

        item.setLayout(layout)
        return item

    def on_version_link_clicked(self, link):
        """处理版本号链接点击事件"""
        # 提取版本号（link 格式为 "#1.2.6"）
        version_number = link.lstrip('#')

        # 查找对应的版本卡片
        target_card = self.version_card_map.get(version_number)

        if target_card:
            # 滚动到目标卡片
            self.version_scroll.ensureWidgetVisible(target_card, 50, 50)

            # 可选：添加高亮闪烁效果
            original_style = target_card.styleSheet()
            target_card.setStyleSheet("""
                QFrame {
                    background: #fff3cd;
                    border: 3px solid #ffc107;
                    border-radius: 8px;
                    padding: 8px;
                }
            """)

            # 0.5秒后恢复原样式
            QTimer.singleShot(500, lambda: target_card.setStyleSheet(original_style))

    def get_git_commits(self):
        """获取所有 Git 提交历史"""
        try:
            # 运行 git log 获取所有提交（格式：hash|message）
            result = subprocess.run(
                ['git', 'log', '--all', '--pretty=format:%h|%s'],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=30
            )

            if result.returncode != 0:
                raise Exception(f'Git 命令失败:\n{result.stderr}')

            # 解析提交记录
            commits = []
            for line in result.stdout.strip().split('\n'):
                if '|' in line:
                    hash_val, message = line.split('|', 1)
                    commits.append({
                        'hash': hash_val.strip(),
                        'message': message.strip()
                    })

            return commits

        except FileNotFoundError:
            raise Exception('未找到 Git 命令，请确保已安装 Git')
        except subprocess.TimeoutExpired:
            raise Exception('Git 命令执行超时')
        except Exception as e:
            raise Exception(f'获取 Git 历史失败:\n{e}')



def main():
    app = QApplication(sys.argv)

    # 设置应用样式
    app.setStyle('Fusion')

    window = ConfigEditor()
    window.show()

    sys.exit(app.exec())


if __name__ == '__main__':
    main()

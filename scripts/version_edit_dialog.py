#!/usr/bin/env python3
"""
版本编辑对话框
用于添加/编辑版本信息
"""

from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QComboBox, QDateEdit, QPlainTextEdit,
    QListWidget, QListWidgetItem, QGroupBox, QMessageBox
)
from PyQt6.QtCore import Qt, QDate


class VersionEditDialog(QDialog):
    """版本编辑对话框"""

    def __init__(self, all_commits=None, existing_version=None, parent=None):
        super().__init__(parent)
        self.all_commits = all_commits or []
        self.existing_version = existing_version  # 如果是编辑模式，传入现有版本数据
        self.is_edit_mode = existing_version is not None

        self.setWindowTitle('编辑版本' if self.is_edit_mode else '新增版本')
        self.setMinimumWidth(700)
        self.setMinimumHeight(600)

        self.init_ui()

        # 如果是编辑模式，填充现有数据
        if self.is_edit_mode:
            self.load_version_data()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 基本信息
        basic_group = QGroupBox('基本信息')
        basic_layout = QVBoxLayout()

        # 版本号
        version_layout = QHBoxLayout()
        version_layout.addWidget(QLabel('版本号:'))
        self.version_input = QLineEdit()
        self.version_input.setPlaceholderText('例如: 1.2.9')
        version_layout.addWidget(self.version_input)
        basic_layout.addLayout(version_layout)

        # 日期
        date_layout = QHBoxLayout()
        date_layout.addWidget(QLabel('日期:'))
        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)
        self.date_input.setDate(QDate.currentDate())
        date_layout.addWidget(self.date_input)
        basic_layout.addLayout(date_layout)

        # 类型
        type_layout = QHBoxLayout()
        type_layout.addWidget(QLabel('类型:'))
        self.type_combo = QComboBox()
        self.type_combo.addItems(['patch', 'minor', 'major'])
        type_layout.addWidget(self.type_combo)

        # 里程碑
        type_layout.addWidget(QLabel('    里程碑:'))
        self.milestone_combo = QComboBox()
        self.milestone_combo.addItems(['否', '是'])
        type_layout.addWidget(self.milestone_combo)
        basic_layout.addLayout(type_layout)

        # 主题
        theme_layout = QHBoxLayout()
        theme_layout.addWidget(QLabel('主题:'))
        self.theme_input = QLineEdit()
        self.theme_input.setPlaceholderText('例如: 版本控制系统与Toast通知')
        theme_layout.addWidget(self.theme_input)
        basic_layout.addLayout(theme_layout)

        basic_group.setLayout(basic_layout)
        layout.addWidget(basic_group)

        # Commits 选择
        commits_group = QGroupBox('Commits 选择')
        commits_layout = QVBoxLayout()

        commits_info = QLabel('从可用提交中选择（双击添加，右键删除）:')
        commits_info.setStyleSheet('color: #666; font-size: 11px;')
        commits_layout.addWidget(commits_info)

        # 两个列表：可用的和已选的
        lists_layout = QHBoxLayout()

        # 可用提交列表
        available_layout = QVBoxLayout()
        available_layout.addWidget(QLabel('可用提交:'))
        self.available_commits_list = QListWidget()
        self.available_commits_list.itemDoubleClicked.connect(self.add_commit)
        available_layout.addWidget(self.available_commits_list)
        lists_layout.addLayout(available_layout)

        # 中间按钮
        buttons_layout = QVBoxLayout()
        buttons_layout.addStretch()
        add_btn = QPushButton('→')
        add_btn.clicked.connect(self.add_selected_commit)
        buttons_layout.addWidget(add_btn)
        remove_btn = QPushButton('←')
        remove_btn.clicked.connect(self.remove_selected_commit)
        buttons_layout.addWidget(remove_btn)
        buttons_layout.addStretch()
        lists_layout.addLayout(buttons_layout)

        # 已选提交列表
        selected_layout = QVBoxLayout()
        selected_layout.addWidget(QLabel('已选提交:'))
        self.selected_commits_list = QListWidget()
        self.selected_commits_list.itemDoubleClicked.connect(self.remove_commit)
        selected_layout.addWidget(self.selected_commits_list)
        lists_layout.addLayout(selected_layout)

        commits_layout.addLayout(lists_layout)

        # 填充可用提交
        for commit in self.all_commits:
            item = QListWidgetItem(f"{commit['hash']}: {commit['message']}")
            item.setData(Qt.ItemDataRole.UserRole, commit)
            self.available_commits_list.addItem(item)

        commits_group.setLayout(commits_layout)
        layout.addWidget(commits_group)

        # Features 编辑
        features_group = QGroupBox('Features (每行一个)')
        features_layout = QVBoxLayout()

        self.features_input = QPlainTextEdit()
        self.features_input.setPlaceholderText(
            '每行输入一个 feature，例如:\n'
            '新增版本控制系统\n'
            'Toast通知功能\n'
            '修复手机端双Toast问题'
        )
        features_layout.addWidget(self.features_input)

        features_group.setLayout(features_layout)
        layout.addWidget(features_group)

        # 底部按钮
        button_layout = QHBoxLayout()
        save_btn = QPushButton('💾 保存')
        save_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton('取消')
        cancel_btn.clicked.connect(self.reject)

        button_layout.addWidget(save_btn)
        button_layout.addWidget(cancel_btn)
        layout.addLayout(button_layout)

        self.setLayout(layout)

    def add_selected_commit(self):
        """添加选中的提交"""
        current_item = self.available_commits_list.currentItem()
        if current_item:
            self.add_commit(current_item)

    def add_commit(self, item):
        """将提交从可用列表移到已选列表"""
        commit = item.data(Qt.ItemDataRole.UserRole)

        # 检查是否已存在
        for i in range(self.selected_commits_list.count()):
            existing_item = self.selected_commits_list.item(i)
            existing_commit = existing_item.data(Qt.ItemDataRole.UserRole)
            if existing_commit['hash'] == commit['hash']:
                return  # 已存在，不重复添加

        # 添加到已选列表
        new_item = QListWidgetItem(f"{commit['hash']}: {commit['message']}")
        new_item.setData(Qt.ItemDataRole.UserRole, commit)
        self.selected_commits_list.addItem(new_item)

    def remove_selected_commit(self):
        """删除选中的提交"""
        current_item = self.selected_commits_list.currentItem()
        if current_item:
            self.remove_commit(current_item)

    def remove_commit(self, item):
        """从已选列表移除提交"""
        row = self.selected_commits_list.row(item)
        self.selected_commits_list.takeItem(row)

    def load_version_data(self):
        """加载现有版本数据（编辑模式）"""
        v = self.existing_version

        self.version_input.setText(v.get('version', ''))
        self.theme_input.setText(v.get('theme', ''))

        # 日期
        date_str = v.get('date', '')
        if date_str:
            date_obj = QDate.fromString(date_str, 'yyyy-MM-dd')
            self.date_input.setDate(date_obj)

        # 类型
        type_val = v.get('type', 'patch')
        index = self.type_combo.findText(type_val)
        if index >= 0:
            self.type_combo.setCurrentIndex(index)

        # 里程碑
        milestone = v.get('milestone', False)
        self.milestone_combo.setCurrentIndex(1 if milestone else 0)

        # Commits
        existing_commits = v.get('commits', [])
        for commit_data in existing_commits:
            hash_val = commit_data.get('hash', '')
            message = commit_data.get('message', '')

            # 在 all_commits 中查找完整信息
            full_commit = None
            for c in self.all_commits:
                if c['hash'] == hash_val:
                    full_commit = c
                    break

            if full_commit:
                item = QListWidgetItem(f"{full_commit['hash']}: {full_commit['message']}")
                item.setData(Qt.ItemDataRole.UserRole, full_commit)
                self.selected_commits_list.addItem(item)
            else:
                # 如果在 all_commits 中找不到，使用现有数据
                item = QListWidgetItem(f"{hash_val}: {message}")
                item.setData(Qt.ItemDataRole.UserRole, {'hash': hash_val, 'message': message})
                self.selected_commits_list.addItem(item)

        # Features
        features = v.get('features', [])
        self.features_input.setPlainText('\n'.join(features))

    def get_version_data(self):
        """获取表单数据"""
        # 收集已选的 commits
        commits = []
        for i in range(self.selected_commits_list.count()):
            item = self.selected_commits_list.item(i)
            commit = item.data(Qt.ItemDataRole.UserRole)
            commits.append({
                'hash': commit['hash'],
                'message': commit['message']
            })

        # 收集 features
        features_text = self.features_input.toPlainText().strip()
        features = [line.strip() for line in features_text.split('\n') if line.strip()]

        return {
            'version': self.version_input.text(),
            'date': self.date_input.date().toString('yyyy-MM-dd'),
            'type': self.type_combo.currentText(),
            'milestone': self.milestone_combo.currentIndex() == 1,
            'theme': self.theme_input.text(),
            'commits': commits,
            'features': features
        }

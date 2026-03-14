/**
 * 撤销操作管理器
 * 用于存储和管理可撤销的操作
 */

class UndoManager {
  constructor() {
    this.actions = new Map();
    this.maxActions = 10; // 最多保留10个可撤销操作
  }

  /**
   * 注册一个可撤销的操作
   * @param {string} actionId - 操作唯一ID
   * @param {object} action - 操作配置
   * @param {string} action.type - 操作类型 (delete, archive, bookmark, etc.)
   * @param {string} action.message - 操作描述
   * @param {function} action.undo - 撤销函数
   * @param {object} action.data - 原始数据（用于撤销恢复）
   */
  register(actionId, action) {
    this.actions.set(actionId, {
      ...action,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10000 // 10秒后过期
    });

    // 清理过期的操作
    this.cleanup();

    // 保持最大数量限制
    if (this.actions.size > this.maxActions) {
      const oldestKey = this.actions.keys().next().value;
      this.actions.delete(oldestKey);
    }
  }

  /**
   * 执行撤销
   * @param {string} actionId - 操作ID
   * @returns {Promise<boolean>} 是否撤销成功
   */
  async undo(actionId) {
    const action = this.actions.get(actionId);
    if (!action) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > action.expiresAt) {
      this.actions.delete(actionId);
      return false;
    }

    try {
      await action.undo();
      this.actions.delete(actionId);
      return true;
    } catch (error) {
      console.error('撤销操作失败:', error);
      return false;
    }
  }

  /**
   * 获取操作
   */
  get(actionId) {
    const action = this.actions.get(actionId);
    if (!action) return null;
    
    // 检查是否过期
    if (Date.now() > action.expiresAt) {
      this.actions.delete(actionId);
      return null;
    }
    
    return action;
  }

  /**
   * 移除操作
   */
  remove(actionId) {
    this.actions.delete(actionId);
  }

  /**
   * 清理过期操作
   */
  cleanup() {
    const now = Date.now();
    for (const [id, action] of this.actions) {
      if (now > action.expiresAt) {
        this.actions.delete(id);
      }
    }
  }

  /**
   * 生成唯一操作ID
   */
  static generateId() {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const undoManager = new UndoManager();
export default undoManager;
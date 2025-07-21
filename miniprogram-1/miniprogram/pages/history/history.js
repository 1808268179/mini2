// miniprogram/pages/history/history.js
Page({
  data: {
    historyList: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    page: 1,
    limit: 10
  },

  onLoad() {
    this.loadHistoryList();
  },

  onPullDownRefresh() {
    this.setData({
      historyList: [],
      page: 1,
      hasMore: true
    });
    this.loadHistoryList(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.loadMore();
    }
  },

  loadHistoryList(callback) {
    this.setData({ isLoading: true });
    
    // 获取用户openid
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      },
      success: res => {
        if (res.result.openid) {
          // 获取识别历史
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'getRecognitionHistory',
              data: {
                openid: res.result.openid,
                page: this.data.page,
                limit: this.data.limit
              }
            },
            success: historyRes => {
              if (historyRes.result.success) {
                const { list, hasMore } = historyRes.result.data;
                this.setData({
                  historyList: [...this.data.historyList, ...list],
                  hasMore: hasMore,
                  isLoading: false
                });
              } else {
                wx.showToast({
                  title: '获取历史记录失败',
                  icon: 'error'
                });
                this.setData({ isLoading: false });
              }
            },
            fail: err => {
              wx.showToast({
                title: '网络错误',
                icon: 'error'
              });
              this.setData({ isLoading: false });
            },
            complete: () => {
              if (callback) callback();
            }
          });
        }
      },
      fail: err => {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'error'
        });
        this.setData({ isLoading: false });
        if (callback) callback();
      }
    });
  },

  loadMore() {
    if (!this.data.hasMore) return;
    
    this.setData({ 
      isLoadingMore: true,
      page: this.data.page + 1
    });
    
    this.loadHistoryList(() => {
      this.setData({ isLoadingMore: false });
    });
  },

  deleteHistory(e) {
    const { historyId, index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条识别记录吗？',
      confirmColor: '#667eea',
      success: res => {
        if (res.confirm) {
          // 获取用户openid
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'getOpenId'
            },
            success: openidRes => {
              if (openidRes.result.openid) {
                // 删除历史记录
                wx.cloud.callFunction({
                  name: 'quickstartFunctions',
                  data: {
                    type: 'deleteRecognitionHistory',
                    data: {
                      openid: openidRes.result.openid,
                      historyId: historyId
                    }
                  },
                  success: deleteRes => {
                    if (deleteRes.result.success) {
                      // 从列表中移除
                      const newList = [...this.data.historyList];
                      newList.splice(index, 1);
                      this.setData({ historyList: newList });
                      
                      wx.showToast({
                        title: '删除成功',
                        icon: 'success'
                      });
                    } else {
                      wx.showToast({
                        title: '删除失败',
                        icon: 'error'
                      });
                    }
                  },
                  fail: err => {
                    wx.showToast({
                      title: '删除失败',
                      icon: 'error'
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前';
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    } else {
      return Math.floor(diff / day) + '天前';
    }
  },

  // 格式化置信度百分比
  formatConfidencePercent(confidence) {
    return (confidence * 100).toFixed(2);
  },

  getConfidenceLevel(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }
});
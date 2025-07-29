// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    isLoading: false,
    isUpdatingAvatar: false,
    isFirstVisit: false, // 标记是否首次访问
    showLoginPrompt: false, // 控制登录提示显示
    menuItems: [
      {
        id: 'history',
        title: '识别历史',
        icon: '/images/icons/history.png',
        arrow: true,
        badge: '',
        url: '/pages/history/history'
      },
      {
        id: 'favorites',
        title: '我的收藏',
        icon: '/images/icons/favorite.png',
        arrow: true,
        badge: '',
        url: '/pages/favorites/favorites'
      },
      {
        id: 'knowledge',
        title: '兰花百科',
        icon: '/images/icons/book.png',
        arrow: true,
        badge: 'new',
        url: '/pages/knowledge/knowledge'
      }
    ],
    settingItems: [
      {
        id: 'feedback',
        title: '意见反馈',
        icon: '/images/icons/feedback.png',
        arrow: true
      },
      {
        id: 'about',
        title: '关于我们',
        icon: '/images/icons/about.png',
        arrow: true
      },
      {
        id: 'privacy',
        title: '隐私政策',
        icon: '/images/icons/privacy.png',
        arrow: true
      }
    ],
    stats: {
      totalRecognitions: 0,
      accurateRecognitions: 0,
      favoriteCount: 0,
      usageDays: 0
    }
  },

  onLoad() {
    // 检查是否支持 getUserProfile (已废弃，但保留兼容性检查)
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    
    // 初始化用户信息
    this.initUserInfo();
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus();
  },

  // 初始化用户信息
  async initUserInfo() {
    try {
      // 检查全局是否已有用户信息
      if (app.globalData.userInfo && app.globalData.openid) {
        this.setData({
          userInfo: app.globalData.userInfo,
          hasUserInfo: true
        });
        this.loadUserStats();
        return;
      }

      // 检查本地存储的登录状态
      const hasEverLoggedIn = wx.getStorageSync('hasEverLoggedIn');
      
      if (!hasEverLoggedIn) {
        // 首次使用，显示登录提示
        this.setData({
          isFirstVisit: true,
          showLoginPrompt: true
        });
      } else {
        // 曾经登录过，尝试自动登录
        await this.autoLogin();
      }
    } catch (error) {
      console.error('初始化用户信息失败:', error);
      this.showDefaultState();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    if (this.data.hasUserInfo) {
      this.loadUserStats();
    }
  },

  // 自动登录
  async autoLogin() {
    try {
      console.log('尝试自动登录...');
      
      // 调用云函数获取openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      if (loginRes.result && loginRes.result.openid) {
        const openid = loginRes.result.openid;
        app.globalData.openid = openid;
        
        // 从云端获取用户信息
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'getUserInfo',
            data: { openid: openid }
          }
        });

        if (result.result && result.result.success && result.result.data) {
          // 找到用户信息，自动登录成功
          const userInfo = result.result.data.userInfo;
          app.globalData.userInfo = userInfo;
          
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true,
            showLoginPrompt: false
          });
          
          console.log('自动登录成功');
          this.loadUserStats();
        } else {
          // 用户信息不存在，可能是新用户或数据丢失
          console.log('用户信息不存在，显示登录界面');
          this.showDefaultState();
        }
      }
    } catch (error) {
      console.error('自动登录失败:', error);
      this.showDefaultState();
    }
  },

  // 显示默认状态（未登录）
  showDefaultState() {
    this.setData({
      userInfo: null,
      hasUserInfo: false,
      showLoginPrompt: true
    });
  },

  // 用户登录
  async handleLogin() {
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true,
      showLoginPrompt: false
    });

    wx.showLoading({
      title: '正在登录...'
    });

    try {
      // 1. 获取openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });

      console.log('[云函数] [login] user openid: ', loginRes.result.openid);
      const openid = loginRes.result.openid;
      app.globalData.openid = openid;

      // 2. 尝试从云端获取已保存的用户信息
      let userInfo = null;
      let userExists = false;
      
      try {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'getUserInfo',
            data: { openid: openid }
          }
        });

        if (result.result && result.result.success && result.result.data) {
          userInfo = result.result.data.userInfo;
          userExists = true;
          console.log('找到已保存的用户信息:', userInfo);
        }
      } catch (error) {
        console.log('获取已保存用户信息失败:', error);
      }

      // 3. 如果没有找到用户信息，创建默认信息
      if (!userInfo) {
        userInfo = {
          nickName: '微信用户',
          avatarUrl: '/images/default-avatar.png'
        };
        
        // 保存默认用户信息到云端
        try {
          await this.saveUserInfoToCloud(openid, userInfo);
          console.log('默认用户信息已保存到云端');
        } catch (error) {
          console.error('保存默认用户信息失败:', error);
        }
      }
      
      // 4. 更新应用状态
      app.globalData.userInfo = userInfo;
      
      // 5. 标记用户已登录过
      wx.setStorageSync('hasEverLoggedIn', true);

      wx.hideLoading();
      this.setData({
        isLoading: false,
        userInfo: userInfo,
        hasUserInfo: true,
        isFirstVisit: false
      });

      const message = !userExists ? 
        '登录成功！欢迎使用兰花识别' : 
        '欢迎回来！';
      
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 2000
      });

      // 重新加载统计数据
      this.loadUserStats();

    } catch (error) {
      wx.hideLoading();
      this.setData({
        isLoading: false,
        showLoginPrompt: true
      });
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      console.error('[云函数] [login] 调用失败', error);
    }
  },

  // 拒绝登录
  handleRejectLogin() {
    this.setData({
      showLoginPrompt: false
    });
    wx.showToast({
      title: '部分功能需要登录后使用',
      icon: 'none',
      duration: 3000
    });
  },

  // 加载用户统计数据
  async loadUserStats() {
    const openid = app.globalData.openid;
    if (!openid) {
      this.setDefaultStats();
      return;
    }
  
    try {
      const result = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getUserStats',
          data: { openid: openid }
        }
      });
      
      if (result.result && result.result.success) {
        this.setData({ stats: result.result.data });
      } else {
        this.setDefaultStats();
      }
    } catch (error) {
      console.error('获取用户统计失败:', error);
      this.setDefaultStats();
    }
  },

  // 设置默认统计数据
  setDefaultStats() {
    this.setData({
      stats: {
        totalRecognitions: 0,
        accurateRecognitions: 0,
        favoriteCount: 0,
        usageDays: 0
      }
    });
  },

  // 选择头像
  async chooseAvatar() {
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (this.data.isUpdatingAvatar) return;
    
    this.setData({
      isUpdatingAvatar: true
    });

    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      const tempFilePath = res.tempFilePaths[0];
      
      wx.showLoading({
        title: '更新头像中...'
      });

      // 上传图片到云存储
      const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });

      // 获取云存储文件的下载链接
      const fileRes = await wx.cloud.getTempFileURL({
        fileList: [uploadRes.fileID]
      });

      const avatarUrl = fileRes.fileList[0].tempFileURL;
      
      // 更新用户信息
      const userInfo = { ...this.data.userInfo, avatarUrl };
      
      this.setData({
        userInfo: userInfo,
        isUpdatingAvatar: false
      });
      
      // 更新全局数据
      app.globalData.userInfo = userInfo;
      
      // 保存用户信息到云端
      await this.saveUserInfoToCloud(app.globalData.openid, userInfo);
      
      wx.hideLoading();
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });

    } catch (error) {
      wx.hideLoading();
      this.setData({
        isUpdatingAvatar: false
      });
      wx.showToast({
        title: '头像更新失败',
        icon: 'none'
      });
      console.error('更新头像失败:', error);
    }
  },

  // 选择头像的回调（兼容旧版本）
  onChooseAvatar(e) {
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const { avatarUrl } = e.detail;

    wx.showLoading({
      title: '正在上传...',
    });

    const cloudPath = `avatars/${app.globalData.openid}-${Date.now()}.png`;

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: avatarUrl,
      success: res => {
        console.log('上传成功', res.fileID);
        
        const userInfo = { ...this.data.userInfo, avatarUrl: res.fileID };
        
        this.setData({
          userInfo: userInfo
        });
        
        app.globalData.userInfo = userInfo;
        this.saveUserInfoToCloud(app.globalData.openid, userInfo);
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      },
      fail: err => {
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        });
        console.error('上传失败', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 输入昵称
  onInputNickname(e) {
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const nickName = e.detail.value;
    if (!nickName.trim()) {
      return;
    }
    
    const userInfo = { ...this.data.userInfo, nickName: nickName.trim() };
    
    this.setData({
      userInfo: userInfo
    });
    
    app.globalData.userInfo = userInfo;
    this.saveUserInfoToCloud(app.globalData.openid, userInfo);
    
    wx.showToast({
      title: '昵称更新成功',
      icon: 'success'
    });
  },

  // 保存用户信息到云数据库
  async saveUserInfoToCloud(openid, userInfo) {
    if (!openid) {
      console.error('保存用户信息失败: 缺少openid');
      return;
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'saveUserInfo',
          data: {
            openid: openid,
            userInfo: userInfo,
            updateTime: new Date()
          }
        }
      });
      
      if (result.result && result.result.success) {
        console.log('用户信息保存成功:', result.result);
      } else {
        console.error('用户信息保存失败:', result.result);
        throw new Error(result.result.errMsg || '保存失败');
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      throw error;
    }
  },

  // 处理菜单项点击
  handleMenuItemTap(e) {
    if (!this.data.hasUserInfo) {
      wx.showModal({
        title: '需要登录',
        content: '此功能需要登录后使用，是否立即登录？',
        success: (res) => {
          if (res.confirm) {
            this.handleLogin();
          }
        }
      });
      return;
    }

    const item = e.currentTarget.dataset.item;
    
    if (item.url) {
      wx.navigateTo({
        url: item.url,
        fail: () => {
          wx.showToast({
            title: '页面暂未开放',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  },

  // 处理设置项点击
  handleSettingItemTap(e) {
    const item = e.currentTarget.dataset.item;
    
    switch(item.id) {
      case 'feedback':
        this.showFeedback();
        break;
      case 'about':
        this.showAbout();
        break;
      case 'privacy':
        this.showPrivacy();
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  // 显示意见反馈
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '感谢您的反馈！您可以通过以下方式联系我们：\n\n微信：TWIohh\n邮箱：1808268179@qq.com',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '智能兰花识别小程序 v1.0.0\n\n基于深度学习技术的兰花品种识别工具，帮助用户快速准确地识别兰花品种。\n\n技术支持：微信云开发',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护。使用本小程序时：\n\n1. 仅收集必要的用户信息\n2. 图片仅用于识别，不会存储\n3. 不会向第三方泄露个人信息',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('hasEverLoggedIn');
          
          // 清除全局数据
          app.globalData.userInfo = null;
          app.globalData.openid = null;
          
          // 更新页面状态
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            showLoginPrompt: true,
            stats: {
              totalRecognitions: 0,
              accurateRecognitions: 0,
              favoriteCount: 0,
              usageDays: 0
            }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '智能兰花识别 - 拍照识别兰花品种',
      path: '/pages/home/home',
      imageUrl: '/images/share-cover.jpg'
    };
  }
});
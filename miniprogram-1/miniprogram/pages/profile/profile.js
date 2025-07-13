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
    
    this.loadUserInfo();
    this.loadUserStats();
  },

  onShow() {
    // 每次显示页面时重新加载用户信息和统计数据
    this.loadUserInfo();
    this.loadUserStats();
  },

  // 加载用户信息
  async loadUserInfo() {
    const userInfo = app.globalData.userInfo;
    const openid = app.globalData.openid;
    
    if (userInfo && openid) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
    } else if (openid && !userInfo) {
      // 有openid但没有userInfo，尝试从云端加载
      try {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'getUserInfo',
            data: {
              openid: openid
            }
          }
        });

        if (result.result && result.result.success && result.result.data) {
          const loadedUserInfo = result.result.data.userInfo;
          app.globalData.userInfo = loadedUserInfo;
          this.setData({
            userInfo: loadedUserInfo,
            hasUserInfo: true
          });
          console.log('从云端加载用户信息成功:', loadedUserInfo);
        } else {
          // 云端没有用户信息，显示默认状态
          this.setData({
            hasUserInfo: false
          });
        }
      } catch (error) {
        console.error('从云端加载用户信息失败:', error);
        this.setData({
          hasUserInfo: false
        });
      }
    } else {
      this.setData({
        hasUserInfo: false
      });
    }
  },

  // 加载用户统计数据
  async loadUserStats() {
    if (!app.globalData.openid) {
      return;
    }

    try {
      // 这里可以调用云函数获取用户统计数据
      // 暂时使用模拟数据
      const stats = {
        totalRecognitions: 25,
        accurateRecognitions: 23,
        favoriteCount: 8,
        usageDays: 15
      };
      
      this.setData({
        stats: stats
      });
    } catch (error) {
      console.error('加载用户统计数据失败:', error);
    }
  },

  // 新版用户登录 - 使用头像昵称填写能力
  async handleLogin() {
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true
    });

    wx.showLoading({
      title: '正在登录...'
    });

    try {
      // 先调用云函数获取openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });

      console.log('[云函数] [login] user openid: ', loginRes.result.openid);
      const openid = loginRes.result.openid;
      app.globalData.openid = openid;

      // 尝试从云端获取已保存的用户信息
      let userInfo = null;
      let userExists = false;
      
      try {
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'getUserInfo',
            data: {
              openid: openid
            }
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

      // 如果没有找到已保存的用户信息，创建默认信息并保存到云端
      if (!userInfo) {
        userInfo = {
          nickName: '微信用户',
          avatarUrl: '/images/default-avatar.png' // 需要添加一个默认头像
        };
        
        // 保存默认用户信息到云端
        try {
          await this.saveUserInfoToCloud(openid, userInfo);
          console.log('默认用户信息已保存到云端');
        } catch (error) {
          console.error('保存默认用户信息失败:', error);
        }
      }
      
      app.globalData.userInfo = userInfo;

      wx.hideLoading();
      this.setData({
        isLoading: false,
        userInfo: userInfo,
        hasUserInfo: true
      });

      const message = !userExists ? 
        '登录成功，请设置头像昵称' : 
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
        isLoading: false
      });
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      console.error('[云函数] [login] 调用失败', error);
    }
  },

  // 选择头像 - 使用新的方法
  async chooseAvatar() {
    if (this.data.isUpdatingAvatar) return;
    
    this.setData({
      isUpdatingAvatar: true
    });

    try {
      // 选择图片
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'], // 压缩图片
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
    const { avatarUrl } = e.detail; // 这是临时路径

    wx.showLoading({
      title: '正在上传...',
    });

    // 1. 定义云存储路径
    const cloudPath = `avatars/${app.globalData.openid}-${Date.now()}.png`;

    // 2. 将图片上传到云存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath, // 上传至云端的路径
      filePath: avatarUrl,  // 小程序临时文件路径
      success: res => {
        // 上传成功后，res.fileID 是文件的永久访问ID
        console.log('上传成功', res.fileID);
        
        // 3. 将永久的 fileID 更新到 userInfo 对象中
        const userInfo = { ...this.data.userInfo, avatarUrl: res.fileID };
        
        this.setData({
          userInfo: userInfo
        });
        
        // 更新全局数据
        app.updateUserInfo(userInfo);
        
        // 4. 将包含永久 fileID 的 userInfo 保存到云数据库
        this.saveUserInfo(userInfo);
        
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
    const nickName = e.detail.value;
    if (!nickName.trim()) {
      return; // 空昵称不保存
    }
    
    const userInfo = { ...this.data.userInfo, nickName: nickName.trim() };
    
    this.setData({
      userInfo: userInfo
    });
    
    // 更新全局数据
    app.globalData.userInfo = userInfo;
    
    // 保存用户信息到云端
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
      // 调用云函数保存用户信息
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

  // 保存用户信息到云数据库（兼容旧版本调用）
  async saveUserInfo(userInfo) {
    try {
      await this.saveUserInfoToCloud(app.globalData.openid, userInfo);
    } catch (error) {
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 处理菜单项点击
  handleMenuItemTap(e) {
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
          // 清除全局数据
          app.globalData.userInfo = null;
          app.globalData.openid = null;
          
          // 更新页面状态
          this.setData({
            userInfo: null,
            hasUserInfo: false,
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
// pages/login/login.js
const app = getApp();

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    isLoading: false
  },

  onLoad: function() {
    // 检查是否已经登录
    if (app.globalData.userInfo && app.globalData.openid) {
      wx.redirectTo({
        url: '/pages/home/home',
      });
    }
  },

  handleLogin() {
    if (this.data.isLoading) return;

    // 先弹出自定义的确认对话框
    wx.showModal({
      title: '授权登录',
      content: '即将请求您的微信授权用于登录，是否继续？',
      success: (modalRes) => {
        // 用户点击了“确定”
        if (modalRes.confirm) {
          this.setData({
            isLoading: true
          });

          wx.showLoading({
            title: '正在登录...',
          });

          // 用户同意后，再调用微信的授权接口
          wx.getUserProfile({
            desc: '用于完善会员资料',
            success: (res) => {
              console.log('获取用户信息成功', res.userInfo);
              app.globalData.userInfo = res.userInfo;

              // 调用云函数获取openid
              wx.cloud.callFunction({
                name: 'login',
                data: {}, // data可以为空，因为云函数端会自动获取上下文
                success: loginRes => {
                  console.log('[云函数] [login] user openid: ', loginRes.result.openid);
                  app.globalData.openid = loginRes.result.openid;

                  wx.hideLoading();
                  this.setData({
                    isLoading: false
                  });

                  wx.showToast({
                    title: '登录成功',
                    icon: 'success',
                    duration: 1500
                  });

                  // 登录成功，跳转到主页
                  setTimeout(() => {
                    wx.redirectTo({
                      url: '/pages/home/home',
                    });
                  }, 1500);
                },
                fail: err => {
                  wx.hideLoading();
                  this.setData({
                    isLoading: false
                  });
                  wx.showToast({
                    title: '登录失败，请重试',
                    icon: 'none'
                  });
                  console.error('[云函数] [login] 调用失败', err);
                }
              });
            },
            // 用户在微信授权框中点击了拒绝
            fail: (err) => {
              wx.hideLoading();
              this.setData({
                isLoading: false
              });
              console.log('用户拒绝授权', err);
              wx.showToast({
                title: '您已取消授权',
                icon: 'none'
              });
            }
          });
        } else if (modalRes.cancel) {
          // 用户在自定义对话框中点击了“取消”
          console.log('用户取消登录');
        }
      }
    });
  },

  // 快速体验（跳过登录，仅用于开发测试）
  handleQuickStart() {
    wx.showModal({
      title: '提示',
      content: '跳过登录将无法保存识别记录，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({
            url: '/pages/home/home',
          });
        }
      }
    });
  }
});
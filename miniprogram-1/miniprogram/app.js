// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: "cloud1-9grlagxidd6e1010",
      userInfo: null,
      openid: null
    };
    
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      
      // 应用启动时尝试自动登录
      this.autoLogin();
    }
  },

  // 自动登录函数
  async autoLogin() {
    try {
      // 调用云函数获取openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      if (loginRes.result && loginRes.result.openid) {
        console.log('[自动登录] 获取到 openid:', loginRes.result.openid);
        this.globalData.openid = loginRes.result.openid;
        
        // 尝试从云数据库获取用户信息
        await this.loadUserInfo();
      }
    } catch (error) {
      console.log('[自动登录] 失败:', error);
      // 自动登录失败不影响应用正常使用
    }
  },

  // 从云数据库加载用户信息
  async loadUserInfo() {
    if (!this.globalData.openid) {
      return;
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getUserInfo',
          data: {
            openid: this.globalData.openid
          }
        }
      });

      if (result.result && result.result.success && result.result.data) {
        this.globalData.userInfo = result.result.data.userInfo;
        console.log('[加载用户信息] 成功:', this.globalData.userInfo);
      } else {
        console.log('[加载用户信息] 用户信息不存在，使用默认信息');
        // 用户信息不存在时，不设置默认信息，让页面处理
      }
    } catch (error) {
      console.error('[加载用户信息] 失败:', error);
    }
  },

  // 更新全局用户信息
  updateUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.openid = null;
  }
});
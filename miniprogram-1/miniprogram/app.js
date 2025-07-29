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
    }
    
    console.log('小程序启动完成');
  },

  // 更新全局用户信息
  updateUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    console.log('全局用户信息已更新:', userInfo);
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.openid = null;
    console.log('全局用户信息已清除');
  },

  // 检查登录状态
  checkLoginStatus() {
    return {
      isLoggedIn: !!(this.globalData.openid && this.globalData.userInfo),
      openid: this.globalData.openid,
      userInfo: this.globalData.userInfo
    };
  },

  // 设置用户登录信息
  setUserLogin(openid, userInfo) {
    this.globalData.openid = openid;
    this.globalData.userInfo = userInfo;
    console.log('用户登录信息已设置:', { openid, userInfo });
  }
});
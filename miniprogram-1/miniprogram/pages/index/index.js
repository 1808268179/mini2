const app = getApp();
Page({
  data: {
    imageSrc: '',
    isLoading: false,
    isUploading: false,
    result: {
      name: '',
      latin: '',
      confidence: 0,
      features: []
    }
  },

  chooseImage() {
    this.setData({ isUploading: true });
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        setTimeout(() => {
          this.setData({
            imageSrc: res.tempFilePaths[0],
            result: { name: '', latin: '', confidence: 0, features: [] },
            isUploading: false
          });
          wx.showToast({
            title: '图片上传成功',
            icon: 'success',
            duration: 1500
          });
        }, 800);
      },
      fail: () => {
        this.setData({ isUploading: false });
        wx.showToast({
          title: '图片选择失败',
          icon: 'error'
        });
      }
    });
  },

  // 在 miniprogram/pages/index/index.js 中修改 startRecognition 函数

  startRecognition() {
    if (!this.data.imageSrc) {
      wx.showToast({
        title: '请先选择一张图片',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: 'AI正在努力识别中...' });

    // 1. 获取文件扩展名
    const filePath = this.data.imageSrc;
    const cloudPath = `recognition/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}${filePath.match(/\.[^.]+?$/)[0]}`;

    // 2. 将图片上传到云存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        // 图片上传成功，获取 fileID
        const fileID = res.fileID;

        // 3. 调用云函数进行识别
        wx.cloud.callFunction({
          name: 'recognition',
          data: {
            fileID: fileID
          },
          success: cfRes => {
            // cfRes.result 是云函数返回的对象
            if (cfRes.result.success) {
              const data = cfRes.result.data;
              const topResult = data.top5_info[0];
              const result = {
                name: topResult.name,
                latin: '',
                confidence: topResult.confidence.toFixed(4),
                features: []
              };

              this.setData({
                result: {
                  ...result,
                  confidence: topResult.confidence.toFixed(4)
                }
              });

              // 保存识别历史
              this.saveRecognitionHistory(fileID, result);

              wx.showToast({
                title: '识别完成！',
                icon: 'success',
                duration: 2000
              });
            } else {
              // 云函数处理失败
              wx.showToast({
                title: '识别服务出错',
                icon: 'error'
              });
            }
          },
          fail: err => {
            wx.showToast({
              title: '云函数调用失败',
              icon: 'error'
            });
          },
          complete: () => {
            this.setData({ isLoading: false });
            wx.hideLoading();
          }
        });
      },
      fail: e => {
        // 图片上传到云存储失败
        wx.showToast({
          title: '图片上传失败',
          icon: 'error'
        });
        this.setData({ isLoading: false });
        wx.hideLoading();
      }
    });
  },

  // 新增保存识别历史的函数
  saveRecognitionHistory(imageUrl, result) {
    // 先获取用户openid
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      },
      success: res => {
        if (res.result.openid) {
          // 保存识别历史
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'saveRecognitionHistory',
              data: {
                openid: res.result.openid,
                imageUrl: imageUrl,
                result: result,
                timestamp: Date.now()
              }
            },
            success: historyRes => {
              console.log('识别历史保存成功:', historyRes);
            },
            fail: err => {
              console.error('识别历史保存失败:', err);
            }
          });
        }
      },
      fail: err => {
        console.error('获取openid失败:', err);
      }
    });
  },

  // 删除了 logout 函数

  getConfidenceLevel(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  },

  getConfidenceText(confidence) {
    if (confidence >= 0.9) return '高可信度';
    if (confidence >= 0.7) return '中等可信度';
    return '低可信度';
  }
});
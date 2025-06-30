const cloud = require('wx-server-sdk');
const axios = require('axios');
const FormData = require('form-data'); // 需要额外安装 form-data

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  // event 对象会包含小程序端传过来的 fileID
  const fileID = event.fileID;
  // AI服务的URL
  const recognitionUrl = 'http://61.136.101.57:5000/predict';

  try {
    // 1. 根据fileID从云存储获取图片文件的临时链接
    const res = await cloud.getTempFileURL({
      fileList: [fileID],
    });
    const fileUrl = res.fileList[0].tempFileURL;

    // 2. 下载图片文件内容
    const imageResponse = await axios({
        url: fileUrl,
        responseType: 'arraybuffer' // 以二进制形式下载图片
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // 3. 将图片内容封装成表单数据，模拟文件上传
    const formData = new FormData();
    // 关键：第三个参数 'file.jpg' 是必需的，模拟一个文件名
    formData.append('file', imageBuffer, 'file.jpg'); 

    // 4. 调用外部AI服务
    const recognitionResponse = await axios.post(recognitionUrl, formData, {
        headers: formData.getHeaders() // 设置正确的请求头
    });

    // 5. 将AI服务返回的结果直接透传给小程序端
    return {
      success: true,
      data: recognitionResponse.data
    };

  } catch (e) {
    console.error('云函数调用失败', e);
    return {
      success: false,
      error: e.message
    };
  }
};